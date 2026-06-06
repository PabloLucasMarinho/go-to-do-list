package database

import (
	"fmt"
	"log"
	"os"

	"todo-go/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN environment variable is not set")
	}

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	DB = db
	fmt.Println("[db] connected successfully")

	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.Task{}); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}
	fmt.Println("[db] migrations applied")
}
