package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

// User represents an application account.
//
// UML relationships:
//   User "1" --> "*" Category  (owns many categories, cascade delete)
//   User "1" --> "*" Task      (owns many tasks, cascade delete)
type User struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"     json:"id"`
	Name      string    `gorm:"not null;size:100"            json:"name"`
	Email     string    `gorm:"unique;not null;size:150"     json:"email"`
	Password  string    `gorm:"not null"                     json:"-"`
	CreatedAt time.Time `                                    json:"created_at"`

	Categories []Category `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"categories,omitempty"`
	Tasks      []Task     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"tasks,omitempty"`
}

// SetPassword hashes plain with bcrypt and stores it.
func (u *User) SetPassword(plain string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hash)
	return nil
}

// CheckPassword returns true when plain matches the stored hash.
func (u *User) CheckPassword(plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(plain)) == nil
}

// IsOwnedBy returns true when the user's own ID equals userID.
// Used for authorization guards throughout the handlers.
func (u *User) IsOwnedBy(userID uint) bool {
	return u.ID == userID
}
