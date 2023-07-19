package models

import (
	"net/http"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Ticket struct {
	ID    primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Owner primitive.ObjectID `json:"owner" bson:"owner"`
	Event primitive.ObjectID `json:"event" bson:"event"`
}

func (ticket *Ticket) Render(w http.ResponseWriter, r *http.Request) error {
	return nil
}
