package config

import (
	"os"
	"time"

	"github.com/aritrosaha10/frasertickets/controllers"
	middlewarecustom "github.com/aritrosaha10/frasertickets/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/go-chi/render"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	_ "github.com/aritrosaha10/frasertickets/docs"
)

var (
	Serv *Server
)

type Server struct {
	Router      *chi.Mux
	Port        string
	Environment string
}

func CreateNewServer() *Server {
	s := &Server{}
	s.Router = chi.NewRouter()
	s.Port = os.Getenv("PORT")
	s.Environment = os.Getenv("FRASERTICKETS_ENV")

	return s
}

func (s *Server) MountHandlers() {
	// Middleware stack
	s.Router.Use(middleware.RequestID)
	s.Router.Use(middleware.RealIP)
	s.Router.Use(middlewarecustom.LoggerMiddleware())
	s.Router.Use(middleware.Timeout(60 * time.Second))
	s.Router.Use(middleware.Heartbeat("/ping"))
	s.Router.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"https://*", "http://*"}, // !! CHANGE THIS LATER
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))
	s.Router.Use(httprate.LimitByRealIP(100, 1*time.Minute))
	s.Router.Use(render.SetContentType(render.ContentTypeJSON))
	s.Router.Use(middleware.Recoverer)

	if s.Environment == "development" {
		s.Router.Get("/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("http://localhost:"+s.Port+"/swagger/doc.json"),
		))
	}

	// Route handlers
	s.Router.Mount("/users", controllers.UserController{}.Routes())
	s.Router.Mount("/events", controllers.EventController{}.Routes())
	s.Router.Mount("/tickets", controllers.TicketController{}.Routes())
}
