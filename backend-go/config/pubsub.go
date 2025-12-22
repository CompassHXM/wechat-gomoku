package config

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

var (
	pubsubEndpoint string
	pubsubKey      string
	hubName        string
)

// InitPubSub 初始化 Azure Web PubSub
func InitPubSub() error {
	connectionString := os.Getenv("PUBSUB_CONNECTION_STRING")
	hubName = os.Getenv("PUBSUB_HUB_NAME")
	if hubName == "" {
		hubName = "gomoku"
	}

	if connectionString == "" {
		return fmt.Errorf("PUBSUB_CONNECTION_STRING is missing in environment variables")
	}

	// 解析连接字符串
	parts := strings.Split(connectionString, ";")
	for _, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 {
			key := strings.TrimSpace(kv[0])
			value := strings.TrimSpace(kv[1])
			if key == "Endpoint" {
				pubsubEndpoint = value
			} else if key == "AccessKey" {
				pubsubKey = value
			}
		}
	}

	if pubsubEndpoint == "" || pubsubKey == "" {
		return fmt.Errorf("invalid PUBSUB_CONNECTION_STRING format")
	}

	return nil
}

// ClientTokenResponse 客户端令牌响应
type ClientTokenResponse struct {
	Token string `json:"token"`
	URL   string `json:"url"`
}

// GetClientAccessToken 获取客户端访问令牌
func GetClientAccessToken(ctx context.Context, userID string, roomID string) (*ClientTokenResponse, error) {
	// 构建 JWT 令牌
	baseURL := strings.TrimSuffix(pubsubEndpoint, "/")
	audience := fmt.Sprintf("%s/client/hubs/%s", baseURL, hubName)

	// 设置过期时间（1小时）
	exp := time.Now().Add(time.Hour).Unix()

	// 创建 JWT payload
	payload := map[string]interface{}{
		"aud": audience,
		"iat": time.Now().Unix(),
		"exp": exp,
		"sub": userID,
	}

	if roomID != "" {
		payload["role"] = []string{"webpubsub.sendToGroup", "webpubsub.joinLeaveGroup"}
		payload["webpubsub.group"] = roomID
	}

	payloadBytes, _ := json.Marshal(payload)
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadBytes)

	// 创建签名
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"typ":"JWT","alg":"HS256"}`))
	message := header + "." + payloadB64

	mac := hmac.New(sha256.New, []byte(pubsubKey))
	mac.Write([]byte(message))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	token := message + "." + signature
	wsURL := fmt.Sprintf("%s/client/hubs/%s", strings.Replace(baseURL, "https://", "wss://", 1), hubName)

	return &ClientTokenResponse{
		Token: token,
		URL:   wsURL,
	}, nil
}

// SendToRoom 向房间发送消息
func SendToRoom(ctx context.Context, roomID string, message interface{}) error {
	endpoint := fmt.Sprintf("%s/api/hubs/%s/groups/%s/:send", pubsubEndpoint, hubName, url.PathEscape(roomID))

	jsonData, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// 添加认证头
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", generateAuthHeader("POST", endpoint, timestamp))
	req.Header.Set("x-ms-date", timestamp)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to send message, status: %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

// AddUserToRoom 将用户添加到房间组
func AddUserToRoom(ctx context.Context, userID string, roomID string) error {
	endpoint := fmt.Sprintf("%s/api/hubs/%s/groups/%s/users/%s",
		pubsubEndpoint, hubName, url.PathEscape(roomID), url.PathEscape(userID))

	req, err := http.NewRequestWithContext(ctx, "PUT", endpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	req.Header.Set("Authorization", generateAuthHeader("PUT", endpoint, timestamp))
	req.Header.Set("x-ms-date", timestamp)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to add user to room: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to add user, status: %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

// RemoveUserFromRoom 从房间组移除用户
func RemoveUserFromRoom(ctx context.Context, userID string, roomID string) error {
	endpoint := fmt.Sprintf("%s/api/hubs/%s/groups/%s/users/%s",
		pubsubEndpoint, hubName, url.PathEscape(roomID), url.PathEscape(userID))

	req, err := http.NewRequestWithContext(ctx, "DELETE", endpoint, nil)
	if err != nil {
		fmt.Printf("Failed to create request: %v\n", err)
		return nil
	}

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	req.Header.Set("Authorization", generateAuthHeader("DELETE", endpoint, timestamp))
	req.Header.Set("x-ms-date", timestamp)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Failed to remove user from room: %v\n", err)
		return nil
	}
	defer resp.Body.Close()

	return nil
}

// generateAuthHeader 生成认证头
func generateAuthHeader(method, urlStr, timestamp string) string {
	u, _ := url.Parse(urlStr)
	stringToSign := fmt.Sprintf("%s\n%s\n%s", method, u.Path, timestamp)

	mac := hmac.New(sha256.New, []byte(pubsubKey))
	mac.Write([]byte(stringToSign))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	return fmt.Sprintf("HMAC-SHA256 Credential=%s, SignedHeaders=x-ms-date, Signature=%s",
		pubsubKey, signature)
}
