package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
)

type claimsKey string

const userClaimsKey claimsKey = "userClaims"

func JWTMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if secret == "" {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "JWT 未配置"})
			return
		}

		// 开发环境下跳过认证
		if secret == "dev-secret" || secret == "parallel-dev-secret-2025" {
			c.Next()
			return
		}

		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "缺少凭证"})
			return
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "凭证格式错误"})
			return
		}
		token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "凭证无效"})
			return
		}
		c.Set(string(userClaimsKey), token.Claims)
		c.Next()
	}
}

func UserClaims(c *gin.Context) any {
	claims, _ := c.Get(string(userClaimsKey))
	return claims
}
