package main

import (
	"context"
	"log"
	"os"
	"time"

	"gomoku-backend/config"
	"gomoku-backend/routes"
	"gomoku-backend/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// 初始化数据库
	ctx := context.Background()
	if err := config.InitDatabase(ctx); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	log.Println("Database initialized successfully")

	// 初始化 Web PubSub
	if err := config.InitPubSub(); err != nil {
		log.Fatalf("Failed to initialize PubSub: %v", err)
	}
	log.Println("PubSub initialized successfully")

	// 创建 Gin 路由器
	router := gin.Default()

	// CORS 配置
	corsConfig := cors.DefaultConfig()
	if allowedOrigins := os.Getenv("ALLOWED_ORIGINS"); allowedOrigins != "" {
		corsConfig.AllowOrigins = []string{allowedOrigins}
	} else {
		corsConfig.AllowAllOrigins = true
	}
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = append(corsConfig.AllowHeaders,
		"webhook-request-origin", "ce-type", "ce-userid", "ce-eventname", "ce-connectionid")
	router.Use(cors.New(corsConfig))

	// 日志中间件
	router.Use(func(c *gin.Context) {
		log.Printf("[%s] %s %s", time.Now().Format(time.RFC3339), c.Request.Method, c.Request.URL.Path)
		c.Next()
	})

	// 健康检查根路由
	router.GET("/", func(c *gin.Context) {
		c.String(200, "Gomoku Backend is running!")
	})

	// 注册路由
	routes.RegisterRoutes(router)

	// 启动定期清理任务
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if err := services.CheckInactiveRooms(ctx); err != nil {
				log.Printf("Error in cleanup task: %v", err)
			}
		}
	}()

	// 启动服务器
	log.Printf("Server is running on port %s", port)
	log.Printf("Environment: %s", os.Getenv("NODE_ENV"))
	log.Printf("API endpoint: http://localhost:%s/api", port)

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
