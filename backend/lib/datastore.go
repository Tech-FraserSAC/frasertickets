package lib

import (
	"context"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	Datastore *MongoDatastore
)

type MongoDatastore struct {
	client *mongo.Client
	Db     *mongo.Database

	connectionStr string
}

func CreateNewDB() *MongoDatastore {
	db := &MongoDatastore{}
	db.connectionStr = os.Getenv("MONGODB_CONNECTION_STR")

	return db
}

func (ds *MongoDatastore) Connect() {
	// Set MongoDB API version to 1
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(ds.connectionStr).SetServerAPIOptions(serverAPI)
	opts.SetConnectTimeout(2 * time.Second)

	// Create client & connect to server
	client, err := mongo.Connect(context.TODO(), opts)
	if err != nil {
		panic(err)
	}
	ds.client = client
	ds.Db = client.Database("main")
}

func (ds *MongoDatastore) Disconnect() {
	if err := ds.client.Disconnect(context.TODO()); err != nil {
		panic(err)
	}
}
