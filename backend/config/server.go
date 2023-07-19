package config

import (
	"net/http"
	"os"
	"time"

	"github.com/aritrosaha10/frasertickets/controllers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/render"
)

var (
	Serv *Server
)

type Server struct {
	Router *chi.Mux
	Port   string
}

func CreateNewServer() *Server {
	s := &Server{}
	s.Router = chi.NewRouter()
	s.Port = os.Getenv("PORT")

	return s
}

func (s *Server) MountHandlers() {
	// Middleware stack
	s.Router.Use(middleware.RequestID)
	s.Router.Use(middleware.RealIP)
	s.Router.Use(middleware.Logger)
	s.Router.Use(middleware.Timeout(60 * time.Second))
	s.Router.Use(middleware.Heartbeat("/ping"))
	s.Router.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"https://*", "http://*"}, // !! CHANGE THIS LATER
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))
	s.Router.Use(render.SetContentType(render.ContentTypeJSON))
	s.Router.Use(middleware.Recoverer)

	// Manual routes
	s.Router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("hi"))
	})

	// Route handlers
	s.Router.Mount("/users", controllers.UserController{}.Routes())
}
