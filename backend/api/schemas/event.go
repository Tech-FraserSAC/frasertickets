package schemas

import "github.com/graphql-go/graphql"

var eventType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Event",
	Fields: graphql.Fields{
		"name": &graphql.Field{
			Type: graphql.String,
		},
		"description": &graphql.Field{
			Type: graphql.String,
		},
		"imageURL": &graphql.Field{
			Type: graphql.String,
		},
		"startTimestamp": &graphql.Field{
			Type: graphql.DateTime,
		},
		"endTimestamp": &graphql.Field{
			Type: graphql.DateTime,
		},
		"id": &graphql.Field{
			Type: graphql.ID,
		},
	},
})

func init() {
	eventType.AddFieldConfig("tickets", &graphql.Field{
		Type: graphql.NewList(ticketType),
	})
}
