package lib

import (
	"context"
	"fmt"
	"os"

	"cloud.google.com/go/storage"
	"github.com/aritrosaha10/frasertickets/util"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/option"
)

var (
	CloudStorage *GoogleCloudStorage
)

type GoogleCloudStorage struct {
	Client          *storage.Client
	MediaBucket     *storage.BucketHandle
	MediaBucketName string

	credentials option.ClientOption
}

func CreateNewStorage() *GoogleCloudStorage {
	cloudStorage := &GoogleCloudStorage{}

	serviceAccountCreds, err := util.PrepareGCPCredentialsFromEnv()
	if err != nil && err.Error() != "could not find FIREBASE_PROJECT_ID in env" {
		log.Fatal().Err(err).Msg("could not marshal firebase creds from env")
	} else {
		cloudStorage.credentials = serviceAccountCreds
	}

	cloudStorage.MediaBucketName = os.Getenv("GCP_MEDIA_BUCKET_NAME")
	if cloudStorage.MediaBucketName == "" {
		log.Fatal().Msg("could not find media bucket name in env")
	}

	fmt.Println("abc")

	// Initialize Cloud Storage
	var client *storage.Client
	if cloudStorage.credentials != nil {
		client, err = storage.NewClient(context.Background(), cloudStorage.credentials)
	} else {
		// Try initializing using ADC
		client, err = storage.NewClient(context.Background())
	}
	cloudStorage.Client = client
	defer client.Close()

	if err != nil {
		log.Fatal().Err(err).Msg("could not initialize cloud storage")
	}

	cloudStorage.MediaBucket = client.Bucket(cloudStorage.MediaBucketName)

	return cloudStorage
}
