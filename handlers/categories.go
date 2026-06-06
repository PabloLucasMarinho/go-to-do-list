package handlers

import (
	"net/http"

	"todo-go/database"
	"todo-go/models"

	"github.com/gin-gonic/gin"
)

type categoryInput struct {
	Name string `json:"name" binding:"required,min=1,max=100"`
}

func ListCategories(c *gin.Context) {
	userID := c.GetUint("userID")

	var categories []models.Category
	if err := database.DB.Where("user_id = ?", userID).Order("name ASC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao buscar categorias"})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func CreateCategory(c *gin.Context) {
	userID := c.GetUint("userID")

	var input categoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.Category
	if database.DB.Where("name = ? AND user_id = ?", input.Name, userID).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "categoria já existe"})
		return
	}

	category := models.Category{Name: input.Name, UserID: userID}
	if err := database.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao criar categoria"})
		return
	}

	c.JSON(http.StatusCreated, category)
}

func UpdateCategory(c *gin.Context) {
	userID := c.GetUint("userID")

	var category models.Category
	if err := database.DB.Where("id = ? AND user_id = ?", c.Param("id"), userID).First(&category).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "categoria não encontrada"})
		return
	}

	var input categoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category.Name = input.Name
	if err := database.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao atualizar categoria"})
		return
	}

	c.JSON(http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	userID := c.GetUint("userID")
	catID := c.Param("id")

	var category models.Category
	if err := database.DB.Where("id = ? AND user_id = ?", catID, userID).First(&category).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "categoria não encontrada"})
		return
	}

	// Unlink tasks before deleting
	database.DB.Model(&models.Task{}).
		Where("category_id = ? AND user_id = ?", catID, userID).
		Update("category_id", nil)

	if err := database.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao excluir categoria"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "categoria excluída"})
}
