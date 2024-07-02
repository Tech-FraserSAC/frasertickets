package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/aritrosaha10/frasertickets/util"
	"github.com/golang-jwt/jwt"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
	oauthJwt "golang.org/x/oauth2/jwt"
)

const (
	batchUrl  = "https://walletobjects.googleapis.com/batch"
	classUrl  = "https://walletobjects.googleapis.com/walletobjects/v1/eventTicketClass"
	objectUrl = "https://walletobjects.googleapis.com/walletobjects/v1/eventTicketObject"
)

var (
	httpClient  *http.Client
	credentials *oauthJwt.Config
	issuerId    string
	issuerName  string
)

type WalletEventClass struct {
	id           string
	suffix       string
	name         string
	heroImageUri string
	longitude    float32
	latitude     float32
	// expiryDate   time.Time
}

type WalletTicketClass struct {
	ownerName     string
	studentNumber string
	qrCodeValue   string
	id            string
	event         *WalletEventClass
	jwt           string
}

func InitializeGoogleWallet(ctx context.Context) {
	var err error
	credentials, err = util.PrepareJWTConfigFromEnv("https://www.googleapis.com/auth/wallet_object.issuer")
	if err != nil && err.Error() != "could not find FIREBASE_PROJECT_ID in env" {
		log.Fatal().Err(err).Msg("could not marshal firebase creds from env")
	} else if err != nil {
		log.Fatal().Err(err).Msg("could not generate creds")
	}

	issuerName = "FraserTickets // John Fraser SAC"

	httpClient = credentials.Client(ctx)
	issuerId = os.Getenv("GOOGLE_WALLET_ISSUER_ID")
	if issuerId == "" {
		log.Fatal().Msg("GOOGLE_WALLET_ISSUER_ID not found in env")
	}
}

func CreateNewWalletEventClass(id string, suffix string, name string, heroImageUri string, longitude float32, latitude float32) (*WalletEventClass, error) {
	e := &WalletEventClass{}
	e.id = id
	e.suffix = suffix
	e.name = name
	e.heroImageUri = heroImageUri
	e.longitude = longitude
	e.latitude = latitude

	// res, err := httpClient.Post(classUrl, "application/json", bytes.NewBuffer([]byte(e.generateString())))

	// if err != nil {
	// 	return &WalletEventClass{}, err
	// }
	// b, _ := io.ReadAll(res.Body)
	// log.Debug().Int("status-code", res.StatusCode).Str("api-response", string(b[:]))

	return e, nil
}

func (event WalletEventClass) generateString() string {
	return fmt.Sprintf(`
	{
		"eventId": "%s",
		"eventName": {
			"defaultValue": {
				"value": "%s",
				"language": "en-US"
			}
		},
		"issuerName": "%s",
		"id": "%s.%s",
		"reviewStatus": "UNDER_REVIEW",
		"classTemplateInfo": {
			"cardTemplateOverride": {
			  "cardRowTemplateInfos": [
				{
				  "oneItem": {
					"item": {
					  "firstValue": {
						"fields": [
						  {
							"fieldPath": "object.textModulesData['student_number']",
						  },
						],
					  },
					},
				  },
				},
			  ],
			},
		  }
	}
	`, event.id, event.name, issuerName, issuerId, event.suffix)
}

func CreateNewWalletTicketClass(ownerName string, studentNumber string, qrCodeValue string, id string, event *WalletEventClass) (*WalletTicketClass, error) {
	t := &WalletTicketClass{}
	t.id = id
	t.ownerName = ownerName
	t.qrCodeValue = qrCodeValue
	t.studentNumber = studentNumber
	t.event = event

	var payload map[string]interface{}
	json.Unmarshal([]byte(fmt.Sprintf(`
	{
		"genericClasses": [%s],
		"genericObjects": [%s]
	}
	`, event.generateString(), t.generateString())), &payload)

	fmt.Println(event.generateString())
	fmt.Println(t.generateString())

	claims := jwt.MapClaims{
		"iss":     credentials.Email,
		"aud":     "google",
		"origins": []string{"https://tickets.johnfrasersac.com"},
		"typ":     "savetowallet",
		"payload": payload,
	}

	// The service account credentials are used to sign the JWT
	key, _ := jwt.ParseRSAPrivateKeyFromPEM(credentials.PrivateKey)
	token, _ := jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(key)

	t.jwt = token

	// res, err := httpClient.Post(classUrl, "application/json", bytes.NewBuffer([]byte(t.generateString())))

	// if err != nil {
	// 	return &WalletTicketClass{}, err
	// }
	// b, _ := io.ReadAll(res.Body)
	// log.Debug().Int("status-code", res.StatusCode).Str("api-response", string(b[:]))

	return t, nil
}

func (ticket WalletTicketClass) generateString() string {
	return fmt.Sprintf(`
	{
		"classId": "%s.%s",
		"ticketHolderName": "%s",
		"logo": {
			"sourceUri": {
			  "uri": "https://tickets.johnfrasersac.com/logo.png"
			},
			"contentDescription": {
			  	"defaultValue": {
					"language": "en-US",
					"value": "FraserTickets Logo"
				},
			},
		},
		"barcode": {
			"type": "QR_CODE",
			"value": "%s"
		},
		"locations": [
			{
				"latitude": %f,
				"longitude": %f
			}
		],
		"cardTitle": {
			"defaultValue": {
			  "language": "en-US",
			  "value": "%s",
			},
		  },
		  "subheader": {
			"defaultValue": {
			  "language": "en-US",
			  "value": "Attendee",
			},
		  },
		  "header": {
			"defaultValue": {
			  "language": "en-US",
			  "value": "%s",
			},
		  },
		  "textModulesData": [
			{
			  "id": "student_number",
			  "header": "Student Number",
			  "body": "%s",
			},
		  ],
		"state": "ACTIVE",
		"linksModuleData": {
			"uris": [
				{
					"id": "LINK_MODULE_URI_ID",
					"uri": "https://tickets.johnfrasersac.com/tickets/%s",
					"description": "Original Ticket"
				}
			]
		},
		"ticketNumber": "%s",
		"id": "%s.%s.%s",
		"hexBackgroundColor": "#4285f4"
	}
	`, issuerId, ticket.event.suffix, ticket.ownerName, ticket.event.heroImageUri, ticket.qrCodeValue, ticket.event.latitude, ticket.event.longitude, ticket.id, ticket.id, ticket.studentNumber, issuerId, ticket.event.suffix, ticket.id)
}

func main() {
	// Load in environment file according to environment
	env := os.Getenv("FRASERTICKETS_ENV")
	if env == "" {
		env = "development"
	}
	godotenv.Load(".env." + env)

	InitializeGoogleWallet(context.Background())

	event, _ := CreateNewWalletEventClass("aaskldljkasd", "frasertickets", "semi-formal", "https://storage.googleapis.com/frasertickets-event-images/semi-formal-2023/semi-formal-2023-pic-1-v2.jpg", 0, 0)
	ticket, _ := CreateNewWalletTicketClass("Aritro Saha", "123456", "tickets.johnfrasersac.com/admin/scan/asdjadsjkldsa", "jsdj231809asdkj", event)

	fmt.Println("Add to Google Wallet link")
	fmt.Println("https://pay.google.com/gp/v/save/" + ticket.jwt)
}
