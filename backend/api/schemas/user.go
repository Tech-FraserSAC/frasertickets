package schemas

import "github.com/graphql-go/graphql"

var userType = graphql.NewObject(graphql.ObjectConfig{
	Name: "User",
	Fields: graphql.Fields{
		"fullName": &graphql.Field{
			Type: graphql.String,
		},
		"profilePicURL": &graphql.Field{
			Type: graphql.String,
		},
		"uid": &graphql.Field{
			Type: graphql.String,
		},
		"studentNumber": &graphql.Field{
			Type: graphql.Int,
		},
		"admin": &graphql.Field{
			Type: graphql.Boolean,
		},
	},
})

func init() {
	userType.AddFieldConfig("tickets", &graphql.Field{
		Type: graphql.NewList(ticketType),
	})
}
