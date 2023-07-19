package models

import (
	"context"
	"fmt"
	"net/http"
	"reflect"

	"github.com/aritrosaha10/frasertickets/lib"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID            string               `json:"id" bson:"_id,omitempty"` // This is also the UUID in Firebase Auth
	Admin         bool                 `json:"admin" bson:"admin"`
	StudentNumber string               `json:"student_number" bson:"student_number"`
	FirstName     string               `json:"first_name" bson:"first_name"`
	LastName      string               `json:"last_name" bson:"last_name"`
	ProfilePicURL string               `json:"pfp_url" bson:"pfp_url"`
	TicketsOwned  []primitive.ObjectID `json:"tickets_owned" bson:"tickets_owned"`
}

func (user *User) Render(w http.ResponseWriter, r *http.Request) error {
	return nil
}

func GetAllUsers(ctx context.Context) ([]User, error) {
	// Try to get data from MongoDB
	cursor, err := lib.Datastore.Db.Collection(usersColName).Find(ctx, bson.D{})
	if err != nil {
		return []User{}, err
	}

	// Attempt to convert BSON data into User structs
	var users []User
	if err := cursor.All(ctx, &users); err != nil {
		return []User{}, err
	}

	return users, nil
}

func GetUserByKey(ctx context.Context, key string, value string) (User, error) {
	// Try to fetch data from DB
	var user User
	err := lib.Datastore.Db.Collection(usersColName).FindOne(ctx, bson.D{{Key: key, Value: value}}).Decode(&user)

	// No error handling needed (user & err will default to empty struct / nil)
	return user, err
}

func CreateNewUser(ctx context.Context, user User) (string, error) {
	// Try to add document
	res, err := lib.Datastore.Db.Collection(usersColName).InsertOne(ctx, user)

	// Return object ID
	return res.InsertedID.(string), err
}

func UpdateExistingUserByStruct(ctx context.Context, user User, fieldsToUpdate User) (User, error) {
	// Confirm that user object exists in database
	_, err := GetUserByKey(ctx, "_id", user.ID)
	if err != nil {
		return User{}, err
	}

	// Check whether fields to update includes Object ID (which cannot be changed)
	if fieldsToUpdate.ID != "" {
		return User{}, fmt.Errorf("cannot update object id of user")
	}

	// Update user object with new values from fieldsToUpdate using reflection
	fieldsToUpdateValue := reflect.ValueOf(fieldsToUpdate)
	userValue := reflect.ValueOf(user)
	for i := 0; i < fieldsToUpdateValue.NumField(); i++ {
		userValue.Field(i).Set(fieldsToUpdateValue.Field(i))
	}
	newUser := userValue.Interface().(User)

	// Run replace operation
	_, err = lib.Datastore.Db.Collection(usersColName).ReplaceOne(ctx, bson.D{{Key: "_id", Value: user.ID}}, newUser)

	// Error checking
	if err != nil {
		return User{}, err
	}

	return newUser, nil
}

func UpdateExistingUserByKeys(ctx context.Context, id string, updates map[string]interface{}) error {
	UPDATABLE_KEYS := map[string]bool{"admin": true, "student_number": true, "first_name": true, "last_name": true, "pfp_url": true}

	// Convert the string/interface map to BSON updates
	bsonUpdates := bson.D{}
	for key, val := range updates {
		// Don't allow other keys to be updated
		if !UPDATABLE_KEYS[key] {
			return ErrEditNotAllowed
		}

		// Add the key/val pair in BSON
		bsonUpdates = append(bsonUpdates, bson.E{Key: key, Value: val})
	}

	// Try to update document in DB
	res, err := lib.Datastore.Db.Collection(usersColName).UpdateByID(ctx, id, bson.D{{Key: "$set", Value: bsonUpdates}})
	if err != nil {
		return err
	}
	if res.ModifiedCount == 0 {
		return ErrNoDocumentModified
	}
	return nil
}
