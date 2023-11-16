package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"os"

	"github.com/aritrosaha10/frasertickets/lib"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func addTicket() {

}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s [EVENT ID] [CSV FILENAME]\n", os.Args[0])
	flag.PrintDefaults()
	os.Exit(2)
}

func main() {
	// Just assume we're running in dev
	godotenv.Load(".env.development")

	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) < 2 {
		usage()
	}

	// Create new auth & DB refs
	lib.Auth = lib.CreateNewAuth()
	lib.Datastore = lib.CreateNewDB()
	lib.Datastore.Connect()
	defer lib.Datastore.Disconnect()

	rawEventID := args[0]
	csvFilename := args[1]

	// Start working with command-line arguments
	eventID, err := primitive.ObjectIDFromHex(rawEventID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "err while parsing event id: %v\n", err)
		os.Exit(3)
	}

	f, err := os.Open(csvFilename)
	if err != nil {
		fmt.Fprintf(os.Stderr, "err while opening csv: %v\n", err)
		os.Exit(3)
	}
	defer f.Close()

	csvReader := csv.NewReader(f)

	// Read first line to get more information about spreadsheet
	_, err = csvReader.Read()
	if err != nil {
		if err == io.EOF {
			fmt.Fprintf(os.Stderr, "csv is empty")
		} else {
			fmt.Fprintf(os.Stderr, "err while parsing csv: %v\n", err)
		}
		os.Exit(3)
	}
	if csvReader.FieldsPerRecord == 0 {
		fmt.Fprintf(os.Stderr, "csv has no columns")
		os.Exit(3)
	}

	// Get important information about spreadsheet from user
	var studentNameColNum int
	fmt.Printf("What column # stores student names (assumed to be in format 'Last Name, First Name') [1-%d]? ", csvReader.FieldsPerRecord)
	if n, err := fmt.Scanf("%d", &studentNameColNum); err != nil || n != 1 {
		fmt.Fprintf(os.Stderr, "could not parse col #: %v\n", err)
		os.Exit(3)
	}
	if studentNameColNum < 1 || studentNameColNum > int(csvReader.FieldsPerRecord) {
		fmt.Fprintf(os.Stderr, "column # given is outside accepted range")
		os.Exit(3)
	}

	var studentNumberColNum int
	fmt.Printf("What column # stores student numbers [1-%d]? ", csvReader.FieldsPerRecord)
	if n, err := fmt.Scanf("%d", &studentNumberColNum); err != nil || n != 1 {
		fmt.Fprintf(os.Stderr, "could not parse col #: %v\n", err)
		os.Exit(3)
	}
	if studentNumberColNum < 1 || studentNumberColNum > int(csvReader.FieldsPerRecord) {
		fmt.Fprintf(os.Stderr, "column # given is outside accepted range")
		os.Exit(3)
	}

	for {
		rec, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			fmt.Fprintf(os.Stderr, "err while parsing csv: %v\n", err)
			os.Exit(3)
		}
		fmt.Printf("%s,%s\n", rec[studentNameColNum-1], rec[studentNumberColNum-1])
	}

	fmt.Printf("%s %s\n", eventID, csvFilename)
}
