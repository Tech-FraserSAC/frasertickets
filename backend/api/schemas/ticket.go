package schemas

import "github.com/graphql-go/graphql"

var ticketType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Ticket",
	Fields: graphql.Fields{
		"holder": &graphql.Field{
			Type: userType,
		},
		"event": &graphql.Field{
			Type: eventType,
		},
		"key": &graphql.Field{
			Type: graphql.String,
		},
		"id": &graphql.Field{
			Type: graphql.ID,
		},
		"scans": &graphql.Field{
			Type: graphql.NewList(ticketScanType),
		},
	},
})

var ticketScanType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Ticket Scan",
	Fields: graphql.Fields{
		"timestamp": &graphql.Field{
			Type: graphql.DateTime,
		},
		"scanner": &graphql.Field{
			Type: userType,
		},
	},
})
