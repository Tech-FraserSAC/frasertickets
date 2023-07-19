package models

import (
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Event struct {
	ID             primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Name           string               `json:"name" bson:"name"`
	Description    string               `json:"description" bson:"description"`
	ImageURL       string               `json:"img_url" bson:"img_url"`
	Location       bson.D               `json:"location" bson:"location"` // Using GeoJSON
	StartTimestamp time.Time            `json:"start_timestamp" bson:"start_timestamp"`
	EndTimestamp   time.Time            `json:"end_timestamp" bson:"end_timestamp"`
	Tickets        []primitive.ObjectID `json:"tickets" bson:"tickets"`
}

func (event *Event) Render(w http.ResponseWriter, r *http.Request) error {
	return nil
}
