package main

import (
	"log"
	"os"

	"todo-go/database"
	"todo-go/handlers"
	"todo-go/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("[env] .env file not found, using environment variables")
	}

	database.Connect()

	r := gin.Default()

	// Static assets
	r.Static("/static", "./static")

	// Pages
	r.GET("/", func(c *gin.Context) { c.File("./templates/index.html") })
	r.GET("/dashboard", middleware.AuthRequired(), func(c *gin.Context) {
		c.File("./templates/dashboard.html")
	})

	// Auth API
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/logout", handlers.Logout)
		auth.GET("/me", middleware.APIAuthRequired(), handlers.Me)
	}

	// Protected API
	api := r.Group("/api", middleware.APIAuthRequired())
	{
		api.GET("/tasks", handlers.ListTasks)
		api.POST("/tasks", handlers.CreateTask)
		api.PUT("/tasks/:id", handlers.UpdateTask)
		api.DELETE("/tasks/:id", handlers.DeleteTask)
		api.PATCH("/tasks/:id/toggle", handlers.ToggleTask)

		api.GET("/categories", handlers.ListCategories)
		api.POST("/categories", handlers.CreateCategory)
		api.PUT("/categories/:id", handlers.UpdateCategory)
		api.DELETE("/categories/:id", handlers.DeleteCategory)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("[server] listening on http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
