package transcode

import (
    "context"
    "encoding/json"
    "log"
    "strings"
    "sync"
    "time"

	"github.com/redis/go-redis/v9"

	"parallel/internal/queue"
)

type Scheduler struct {
    dispatcher *queue.Dispatcher
    worker     Worker
    logger     *log.Logger

    groupName string
    consumer  string
	once      sync.Once
}

type Worker interface {
	Process(ctx context.Context, payload queue.JobPayload) error
}

func NewScheduler(dispatcher *queue.Dispatcher, worker Worker, logger *log.Logger) *Scheduler {
    return &Scheduler{
        dispatcher: dispatcher,
        worker:     worker,
        logger:     logger,
        groupName:  "transcode_group",
        // 使用较稳定的 consumer 名称，避免重启后大量消息留在旧 consumer 的 PEL
        // 仍然配合 XAUTOCLAIM 做兜底认领
        consumer:   "consumer-main",
    }
}

func (s *Scheduler) Start(ctx context.Context) error {
	var startErr error
	s.once.Do(func() {
		if err := s.ensureGroup(ctx); err != nil {
			startErr = err
			return
		}
		go s.loop(ctx)
	})
	return startErr
}

func (s *Scheduler) ensureGroup(ctx context.Context) error {
	client := s.dispatcher.Client()
	if err := client.XGroupCreateMkStream(ctx, s.dispatcher.Stream(), s.groupName, "0").Err(); err != nil {
		if !isGroupExistsErr(err) {
			return err
		}
	}
	return nil
}

func isGroupExistsErr(err error) bool {
	return err != nil && strings.Contains(err.Error(), "BUSYGROUP")
}

func (s *Scheduler) loop(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
        }
        // 先认领陈旧 pending 消息，避免消息永远卡在旧 consumer 的 PEL
        if err := s.claimAndProcessPending(ctx); err != nil {
            s.logger.Printf("claim pending error: %v", err)
        }

        // 再读取新消息
        messages, err := s.dispatcher.Consume(ctx, s.groupName, s.consumer)
        if err != nil {
            if err != redis.Nil {
                s.logger.Printf("consume error: %v", err)
            }
            continue
        }
        s.processMessages(ctx, messages)
    }
}

func (s *Scheduler) Submit(ctx context.Context, payload queue.JobPayload) error {
    return s.dispatcher.EnqueueJob(ctx, payload)
}

// claimAndProcessPending 使用 XAUTOCLAIM 认领空闲超过阈值的 pending 消息
func (s *Scheduler) claimAndProcessPending(ctx context.Context) error {
    client := s.dispatcher.Client()
    // 认领空闲 >=30s 的消息，分批次处理
    const minIdle = 30 * time.Second
    start := "0-0"
    for i := 0; i < 10; i++ { // 最多循环 10 次，避免长时间阻塞
        msgs, next, err := client.XAutoClaim(ctx, &redis.XAutoClaimArgs{
            Stream:   s.dispatcher.Stream(),
            Group:    s.groupName,
            Consumer: s.consumer,
            MinIdle:  minIdle,
            Start:    start,
            Count:    20,
        }).Result()
        if err != nil {
            if err == redis.Nil {
                return nil
            }
            return err
        }
        if len(msgs) == 0 {
            return nil
        }
        s.processMessages(ctx, msgs)
        start = next
    }
    return nil
}

// processMessages 统一处理消息（解析、执行业务、ACK）
func (s *Scheduler) processMessages(ctx context.Context, messages []redis.XMessage) {
    for _, msg := range messages {
        rawValue, ok := msg.Values["payload"]
        if !ok {
            s.logger.Printf("payload 缺失: %+v", msg.Values)
            _ = s.dispatcher.Ack(ctx, s.groupName, msg.ID)
            continue
        }

        var payloadBytes []byte
        switch v := rawValue.(type) {
        case string:
            payloadBytes = []byte(v)
        case []byte:
            payloadBytes = v
        default:
            s.logger.Printf("payload 类型错误: %T", rawValue)
            _ = s.dispatcher.Ack(ctx, s.groupName, msg.ID)
            continue
        }

        var payload queue.JobPayload
        if err := json.Unmarshal(payloadBytes, &payload); err != nil {
            s.logger.Printf("payload 解析失败: %v", err)
            _ = s.dispatcher.Ack(ctx, s.groupName, msg.ID)
            continue
        }

        if err := s.worker.Process(ctx, payload); err != nil {
            s.logger.Printf("process job %s error: %v", msg.ID, err)
            // 处理失败：直接 ACK 避免作业卡在 pending；状态已在 worker 内标记为 FAILED
            if ackErr := s.dispatcher.Ack(ctx, s.groupName, msg.ID); ackErr != nil {
                s.logger.Printf("ack failed job %s error: %v", msg.ID, ackErr)
            }
            continue
        }

        if err := s.dispatcher.Ack(ctx, s.groupName, msg.ID); err != nil {
            s.logger.Printf("ack job %s error: %v", msg.ID, err)
        }
    }
}
