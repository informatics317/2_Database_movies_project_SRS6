from django.urls import path
from . import views, dashboard_views, api_views


urlpatterns = [
    path('accounts/register/', views.register, name='register'),

    path('', views.catalog, name='catalog'),
    path('search/', views.advanced_search, name='search'),
    path('stats/', dashboard_views.stats, name='stats'),
    path('movies/<int:pk>/', views.movie_detail, name='movie_detail'),
    path('movies/add/', views.movie_add, name='movie_add'),

    path('my/', dashboard_views.my_movies, {'kind': 'all'}, name='my_all'),
    path('my/watch/', dashboard_views.my_movies, {'kind': 'watch'}, name='my_watch'),
    path('my/favorite/', dashboard_views.my_movies, {'kind': 'favorite'}, name='my_favorite'),
    path('my/watched/', dashboard_views.my_movies, {'kind': 'watched'}, name='my_watched'),

    path('workspace/', api_views.workspace, name='workspace'),

    path('api/genres/', api_views.api_genres, name='api_genres'),
    path('api/movies/', api_views.api_movies, name='api_movies'),
    path('api/recommend/', api_views.api_recommend, name='api_recommend'),
    path('api/movies/<int:pk>/', api_views.api_movie_detail, name='api_movie_detail'),

    path('movies/partial/', views.movie_partial, name='movie_partial'),
    path('movies/<int:pk>/mark/<str:kind>/', views.toggle_mark, name='toggle_mark'),
    path('movies/<int:pk>/rate/', views.rate_movie, name='rate_movie'),
    path('movies/<int:pk>/reviews/add/', views.add_review, name='add_review'),
    path('reviews/<int:pk>/delete/', views.delete_review, name='delete_review'),
    path('movies/<int:pk>/delete/', views.delete_movie, name='delete_movie'),
]

