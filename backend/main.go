package main

import "github.com/aritrosaha10/frasertickets/app"

//	@title			FraserTickets Backend
//	@version		1.0
//	@description	The backend REST API for FraserTickets.

//	@contact.name	Aritro Saha
//	@contact.url	http://www.aritrosaha.ca
//	@contact.email	aritro.saha729@gmail.com

// @host		localhost:3001
// @BasePath	/
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
func main() {
	app.Run()
}
