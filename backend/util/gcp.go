package util

import (
	"encoding/json"
	"errors"
	"os"

	"google.golang.org/api/option"
)

func PrepareGCPCredentialsFromEnv() (option.ClientOption, error) {
	if _, present := os.LookupEnv("FIREBASE_PROJECT_ID"); present {
		// Import and format credentials from env to JSON
		firebaseCreds := map[string]string{
			"type":                        "service_account",
			"project_id":                  os.Getenv("FIREBASE_PROJECT_ID"),
			"private_key_id":              os.Getenv("FIREBASE_PRIVATE_KEY_ID"),
			"private_key":                 os.Getenv("FIREBASE_PRIVATE_KEY"),
			"client_email":                os.Getenv("FIREBASE_CLIENT_EMAIL"),
			"client_id":                   os.Getenv("FIREBASE_CLIENT_ID"),
			"auth_uri":                    "https://accounts.google.com/o/oauth2/auth",
			"token_uri":                   "https://oauth2.googleapis.com/token",
			"auth_provider_x509_cert_url": os.Getenv("FIREBASE_AUTH_PROVIDER_CERT_URL"),
			"client_x509_cert_url":        os.Getenv("FIREBASE_CLIENT_CERT_URL"),
			"universe_domain":             "googleapis.com",
		}
		serviceAccountJSON, err := json.Marshal(firebaseCreds)
		if err != nil {
			return nil, err
		}
		return option.WithCredentialsJSON(serviceAccountJSON), nil
	} else {
		return nil, errors.New("could not find FIREBASE_PROJECT_ID in env")
	}
}
