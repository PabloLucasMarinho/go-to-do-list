package models

import "time"

// Category groups tasks by topic and is always owned by a single user.
//
// UML relationships:
//   Category "*" --> "1" User  (belongs to user)
//   Category "1" --> "*" Task  (has many tasks; SET NULL on delete)
type Category struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"not null;size:100"        json:"name"`
	UserID    uint      `gorm:"not null;index"           json:"user_id"`
	CreatedAt time.Time `                                json:"created_at"`

	User  User   `gorm:"foreignKey:UserID"                                    json:"-"`
	Tasks []Task `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL"   json:"tasks,omitempty"`
}

// IsOwnedBy returns true when this category belongs to userID.
func (c *Category) IsOwnedBy(userID uint) bool {
	return c.UserID == userID
}
