package models

import "time"

// Task is a single to-do item owned by a user and optionally grouped into a category.
//
// UML relationships:
//   Task "*" --> "1" User      (belongs to user)
//   Task "*" --> "0..1" Category (optionally belongs to category)
type Task struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Title       string    `gorm:"not null;size:200"        json:"title"`
	Description string    `gorm:"size:1000"                json:"description"`
	Done        bool      `gorm:"default:false"            json:"done"`
	UserID      uint      `gorm:"not null;index"           json:"user_id"`
	CategoryID  *uint     `gorm:"index"                    json:"category_id"`
	CreatedAt   time.Time `                                json:"created_at"`
	UpdatedAt   time.Time `                                json:"updated_at"`

	User     User      `gorm:"foreignKey:UserID"     json:"-"`
	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

// MarkAsDone sets the task as completed.
func (t *Task) MarkAsDone() {
	t.Done = true
}

// MarkAsPending sets the task as not completed.
func (t *Task) MarkAsPending() {
	t.Done = false
}

// ToggleDone flips the completion status between done and pending.
func (t *Task) ToggleDone() {
	t.Done = !t.Done
}

// IsOwnedBy returns true when this task belongs to userID.
func (t *Task) IsOwnedBy(userID uint) bool {
	return t.UserID == userID
}
