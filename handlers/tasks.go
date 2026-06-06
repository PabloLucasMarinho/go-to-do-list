package handlers

import (
	"net/http"

	"todo-go/database"
	"todo-go/models"

	"github.com/gin-gonic/gin"
)

type taskCreateInput struct {
	Title       string `json:"title"       binding:"required,min=1,max=200"`
	Description string `json:"description"`
	CategoryID  *uint  `json:"category_id"`
}

type taskUpdateInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Done        *bool   `json:"done"`
	// 0 = remove category, >0 = assign category, absent/nil = no change
	CategoryID *uint `json:"category_id"`
}

func ListTasks(c *gin.Context) {
	userID := c.GetUint("userID")

	query := database.DB.
		Where("user_id = ?", userID).
		Preload("Category").
		Order("created_at DESC")

	switch c.Query("status") {
	case "done":
		query = query.Where("done = ?", true)
	case "pending":
		query = query.Where("done = ?", false)
	}

	if cat := c.Query("category_id"); cat != "" && cat != "0" {
		query = query.Where("category_id = ?", cat)
	}

	var tasks []models.Task
	if err := query.Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao buscar tarefas"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func CreateTask(c *gin.Context) {
	userID := c.GetUint("userID")

	var input taskCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.CategoryID != nil && *input.CategoryID != 0 {
		if err := validateCategoryOwnership(*input.CategoryID, userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "categoria inválida"})
			return
		}
	}

	task := models.Task{
		Title:       input.Title,
		Description: input.Description,
		UserID:      userID,
		CategoryID:  input.CategoryID,
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao criar tarefa"})
		return
	}

	database.DB.Preload("Category").First(&task, task.ID)
	c.JSON(http.StatusCreated, task)
}

func UpdateTask(c *gin.Context) {
	userID := c.GetUint("userID")

	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tarefa não encontrada"})
		return
	}

	var input taskUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title != nil {
		task.Title = *input.Title
	}
	if input.Description != nil {
		task.Description = *input.Description
	}
	if input.Done != nil {
		if *input.Done {
			task.MarkAsDone()
		} else {
			task.MarkAsPending()
		}
	}
	if input.CategoryID != nil {
		if *input.CategoryID == 0 {
			task.CategoryID = nil
		} else {
			if err := validateCategoryOwnership(*input.CategoryID, userID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "categoria inválida"})
				return
			}
			task.CategoryID = input.CategoryID
		}
	}

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao atualizar tarefa"})
		return
	}

	database.DB.Preload("Category").First(&task, task.ID)
	c.JSON(http.StatusOK, task)
}

func DeleteTask(c *gin.Context) {
	userID := c.GetUint("userID")

	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tarefa não encontrada"})
		return
	}

	if err := database.DB.Delete(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao excluir tarefa"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "tarefa excluída"})
}

func ToggleTask(c *gin.Context) {
	userID := c.GetUint("userID")

	var task models.Task
	if err := database.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tarefa não encontrada"})
		return
	}

	task.ToggleDone()

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao atualizar tarefa"})
		return
	}

	database.DB.Preload("Category").First(&task, task.ID)
	c.JSON(http.StatusOK, task)
}

func validateCategoryOwnership(categoryID, userID uint) error {
	var cat models.Category
	return database.DB.Where("id = ? AND user_id = ?", categoryID, userID).First(&cat).Error
}
