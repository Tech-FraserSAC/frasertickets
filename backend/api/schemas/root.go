package schemas

import "github.com/graphql-go/graphql"

var RootQuery = graphql.NewObject(graphql.ObjectConfig{
	Name: "RootQuery",
	Fields: graphql.Fields{
		"userbyStudentID": &graphql.Field{
			Type:        userType,
			Description: "Get single user",
			Args: graphql.FieldConfigArgument{
				"studentID": &graphql.ArgumentConfig{
					Type: graphql.String,
				},
			},
			Resolve: func(params graphql.ResolveParams) (interface{}, error) {
				return nil, nil
			},
		},

		"userbyUID": &graphql.Field{
			Type:        userType,
			Description: "Get single user",
			Args: graphql.FieldConfigArgument{
				"uid": &graphql.ArgumentConfig{
					Type: graphql.ID,
				},
			},
			Resolve: func(params graphql.ResolveParams) (interface{}, error) {
				return nil, nil
			},
		},

		"users": &graphql.Field{
			Type:        graphql.NewList(userType),
			Description: "List of users",
			Resolve: func(params graphql.ResolveParams) (interface{}, error) {
				return nil, nil
			},
		},

		"event": &graphql.Field{
			Type:        eventType,
			Description: "Get single event",
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{
					Type: graphql.ID,
				},
			},
			Resolve: func(params graphql.ResolveParams) (interface{}, error) {
				return nil, nil
			},
		},

		"events": &graphql.Field{
			Type:        graphql.NewList(eventType),
			Description: "List of events",
			Resolve: func(params graphql.ResolveParams) (interface{}, error) {
				return nil, nil
			},
		},

		"ticketByID": &graphql.Field{
			Type:        ticketType,
			Description: "Get single ticket",
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{
					Type: graphql.ID,
				},
			},
			Resolve: func(params graphql.ResolveParams) (interface{}, error) {
				return nil, nil
			},
		},

		"ticketByKey": &graphql.Field{
			Type:        ticketType,
			Description: "Get single ticket",
			Args: graphql.FieldConfigArgument{
				"key": &graphql.ArgumentConfig{
					Type: graphql.String,
				},
			},
			Resolve: func(params graphql.ResolveParams) (interface{}, error) {
				return nil, nil
			},
		},
	},
})
