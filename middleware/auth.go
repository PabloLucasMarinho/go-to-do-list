package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JWT payload.
type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func tokenFromRequest(c *gin.Context) string {
	if cookie, err := c.Cookie("token"); err == nil {
		return cookie
	}
	if auth := c.GetHeader("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

func parseClaims(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}

// AuthRequired redirects unauthenticated page requests to "/".
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := tokenFromRequest(c)
		if tokenStr == "" {
			c.Redirect(http.StatusFound, "/")
			c.Abort()
			return
		}
		claims, err := parseClaims(tokenStr)
		if err != nil {
			c.Redirect(http.StatusFound, "/")
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}

// APIAuthRequired returns 401 JSON for unauthenticated API requests.
func APIAuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := tokenFromRequest(c)
		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		claims, err := parseClaims(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}
