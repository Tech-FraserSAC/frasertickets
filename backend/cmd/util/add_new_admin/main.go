package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/aritrosaha10/frasertickets/models"
	"github.com/joho/godotenv"
)

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s [UID]\n", os.Args[0])
	flag.PrintDefaults()
	os.Exit(2)
}

func main() {
	// Just assume we're running in dev
	godotenv.Load(".env.development")

	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) < 1 {
		fmt.Fprintf(os.Stderr, "uid of user is missing\n")
		os.Exit(1)
	}

	// Create new auth & DB refs
	lib.Auth = lib.CreateNewAuth()
	lib.Datastore = lib.CreateNewDB()
	lib.Datastore.Connect()
	defer lib.Datastore.Disconnect()

	uid := args[0]

	// Update Firebase claims
	fmt.Printf("setting firebase auth claims of user %s\n", uid)
	claims := map[string]interface{}{"admin": true}
	err := lib.Auth.Client.SetCustomUserClaims(context.Background(), uid, claims)
	if err != nil {
		fmt.Fprintf(os.Stderr, "err while setting firebase user claims: %v\n", err)
		os.Exit(3)
	}

	// Update user data on MongoDB
	fmt.Printf("setting user data in mongodb of user %s\n", uid)
	err = models.UpdateExistingUserByKeys(context.Background(), uid, claims)
	if err != nil {
		fmt.Fprintf(os.Stderr, "err while updating user data in mongodb: %v\n", err)
		os.Exit(3)
	}

	fmt.Printf("user %s successfully given admin access", uid)
}
