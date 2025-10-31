package queue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type Dispatcher struct {
	client *redis.Client
	stream string
}

type JobPayload struct {
	MediaID uint   `json:"mediaId"`
	Source  string `json:"source"`
}

func NewRedis(url string) *redis.Client {
	opt, err := redis.ParseURL(url)
	if err != nil {
		panic(err)
	}
	return redis.NewClient(opt)
}

func NewDispatcher(client *redis.Client, stream string) *Dispatcher {
	return &Dispatcher{client: client, stream: stream}
}

func (d *Dispatcher) Client() *redis.Client {
	return d.client
}

func (d *Dispatcher) Stream() string {
	return d.stream
}

func (d *Dispatcher) Enqueue(ctx context.Context, payload map[string]any) error {
	return d.client.XAdd(ctx, &redis.XAddArgs{Stream: d.stream, ID: "*", Values: payload}).Err()
}

func (d *Dispatcher) EnqueueJob(ctx context.Context, payload JobPayload) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return d.Enqueue(ctx, map[string]any{"payload": string(raw)})
}

func (d *Dispatcher) Consume(ctx context.Context, group, consumer string) ([]redis.XMessage, error) {
	msgs, err := d.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    group,
		Consumer: consumer,
		Streams:  []string{d.stream, ">"},
		Count:    10,
		Block:    5 * time.Second,
	}).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}
	if len(msgs) == 0 {
		return nil, nil
	}
	return msgs[0].Messages, nil
}

func (d *Dispatcher) Ack(ctx context.Context, group, id string) error {
	return d.client.XAck(ctx, d.stream, group, id).Err()
}

func (d *Dispatcher) Retry(ctx context.Context, group, id string) error {
	return d.client.XClaim(ctx, &redis.XClaimArgs{
		Stream:   d.stream,
		Group:    group,
		Consumer: group + "-retry",
		MinIdle:  30 * time.Second,
		Messages: []string{id},
	}).Err()
}
