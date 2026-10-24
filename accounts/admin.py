from django.contrib import admin

from .models import Genre, Mark, Movie, Rating, Review


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'year', 'director', 'rating')
    list_filter = ('genres', 'year')
    search_fields = ('title', 'original_title', 'director')
    filter_horizontal = ('genres',)


@admin.register(Mark)
class MarkAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'movie', 'kind', 'created_at')
    list_filter = ('kind',)


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'movie', 'score')
    list_filter = ('score',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'movie', 'user', 'created_at')
    list_filter = ('movie',)
    search_fields = ('text',)
