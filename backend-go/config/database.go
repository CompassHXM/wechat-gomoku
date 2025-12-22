package config

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
)

var (
	cosmosClient    *azcosmos.Client
	cosmosContainer *azcosmos.ContainerClient
)

// InitDatabase 初始化 Cosmos DB 连接
func InitDatabase(ctx context.Context) error {
	endpoint := os.Getenv("COSMOS_ENDPOINT")
	key := os.Getenv("COSMOS_KEY")
	databaseID := os.Getenv("COSMOS_DATABASE")
	containerID := os.Getenv("COSMOS_CONTAINER")

	if databaseID == "" {
		databaseID = "gomoku"
	}
	if containerID == "" {
		containerID = "game_rooms"
	}

	log.Println("--- Cosmos DB Configuration ---")
	log.Printf("Endpoint: %s", endpoint)
	log.Printf("Key exists: %v", key != "")
	log.Printf("Key length: %d", len(key))
	log.Printf("Database ID: %s", databaseID)
	log.Println("-------------------------------")

	if endpoint == "" || key == "" {
		return fmt.Errorf("COSMOS_ENDPOINT or COSMOS_KEY is missing in environment variables")
	}

	// 创建 Cosmos DB 客户端
	cred, err := azcosmos.NewKeyCredential(key)
	if err != nil {
		return fmt.Errorf("failed to create key credential: %w", err)
	}

	client, err := azcosmos.NewClientWithKey(endpoint, cred, nil)
	if err != nil {
		return fmt.Errorf("failed to create cosmos client: %w", err)
	}

	cosmosClient = client

	// 创建数据库（如果不存在）
	databaseProperties := azcosmos.DatabaseProperties{ID: databaseID}
	_, err = client.CreateDatabase(ctx, databaseProperties, nil)
	if err != nil {
		// 如果数据库已存在，忽略错误
		log.Printf("Database may already exist: %v", err)
	}

	// 获取容器客户端
	containerClient, err := client.NewContainer(databaseID, containerID)
	if err != nil {
		return fmt.Errorf("failed to get container client: %w", err)
	}

	cosmosContainer = containerClient

	log.Printf("Connected to Cosmos DB: %s/%s", databaseID, containerID)
	return nil
}

// GetContainer 获取容器客户端
func GetContainer() *azcosmos.ContainerClient {
	return cosmosContainer
}

// GetClient 获取 Cosmos DB 客户端
func GetClient() *azcosmos.Client {
	return cosmosClient
}
