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
	fmt.Fprintf(os.Stderr, "usage: %s [student #]\n", os.Args[0])
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
		fmt.Fprintf(os.Stderr, "student number of user is missing\n")
		os.Exit(1)
	}

	// Create new auth & DB refs
	lib.Auth = lib.CreateNewAuth()
	lib.Datastore = lib.CreateNewDB()
	lib.Datastore.Connect()
	defer lib.Datastore.Disconnect()

	studentNumber := args[0]

	// Get user from student number
	user, err := models.GetUserByKey(context.Background(), "student_number", studentNumber)
	if err != nil {
		fmt.Fprintf(os.Stderr, "err while finding user from student number: %v\n", err)
		os.Exit(3)
	}

	userSummary := fmt.Sprintf("user %s (student # %s, uid %s)", user.FullName, user.StudentNumber, user.ID)

	// Update Firebase claims
	fmt.Printf("setting firebase auth claims of %s\n", userSummary)
	claims := map[string]interface{}{"admin": false}
	err = lib.Auth.Client.SetCustomUserClaims(context.Background(), user.ID, claims)
	if err != nil {
		fmt.Fprintf(os.Stderr, "err while setting firebase user claims: %v\n", err)
		os.Exit(3)
	}

	// Update user data on MongoDB
	fmt.Printf("setting user data in mongodb of user %s\n", user.ID)
	err = models.UpdateExistingUserByKeys(context.Background(), user.ID, claims)
	if err != nil {
		fmt.Fprintf(os.Stderr, "err while updating user data in mongodb: %v\n", err)
		os.Exit(3)
	}

	fmt.Printf("successfully removed admin access for user %s", user.ID)
}
