import time

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import render

from .models import Genre, Mark, Movie
from .views import MARK_NAMES, rating_stats

PAGE_SIZE = 6

ORDERINGS = ['-rating', '-year', 'duration', 'title']

@login_required
def workspace(request):
    return render(request, 'workspace.html')

def demo_options(request):
    delay = request.GET.get('delay', '')
    if delay.isdigit():
        time.sleep(min(int(delay), 5))

    if request.GET.get('error') == '1':
        return JsonResponse({'error': 'Тестовая ошибка сервера'}, status=500)

    return None

def movie_to_dict(movie):
    genres = []
    for genre in movie.genres.all():
        genres.append(genre.name)

    return {
        'id': movie.id,
        'title': movie.title,
        'year': movie.year,
        'director': movie.director,
        'duration': movie.duration,
        'rating': str(movie.rating),
        'poster': movie.poster_src,
        'hue': movie.hue,
        'hue_2': movie.hue_2,
        'genres': genres,
    }

@login_required
def api_genres(request):
    result = []
    for genre in Genre.objects.annotate(n=Count('movies')):
        result.append({'id': genre.id, 'name': genre.name, 'count': genre.n})

    return JsonResponse({'results': result})

def make_page(request, movies):
    page_number = request.GET.get('page', '1')
    if not page_number.isdigit():
        page_number = 1
    paginator = Paginator(movies, PAGE_SIZE)
    page = paginator.get_page(page_number)

    results = []
    for movie in page:
        results.append(movie_to_dict(movie))

    return JsonResponse({
        'count': paginator.count,
        'page': page.number,
        'pages': paginator.num_pages,
        'results': results,
    })


@login_required
def api_movies(request):
    error = demo_options(request)
    if error:
        return error

    movies = Movie.objects.prefetch_related('genres')

    search = request.GET.get('search', '').strip().lower()
    if search != '':
        found_ids = []
        for movie in movies:
            if movie.title.lower().startswith(search):
                found_ids.append(movie.id)
        movies = movies.filter(id__in=found_ids)

    movies = movies.order_by('title')
    return make_page(request, movies)

@login_required
def api_recommend(request):
    error = demo_options(request)
    if error:
        return error

    movies = Movie.objects.prefetch_related('genres')

    genre = request.GET.get('genre', '')
    if genre.isdigit():
        movies = movies.filter(genres__id=int(genre))

    max_duration = request.GET.get('max_duration', '')
    if max_duration.isdigit():
        movies = movies.filter(duration__lte=int(max_duration))

    min_rating = request.GET.get('min_rating', '')
    try:
        movies = movies.filter(rating__gte=float(min_rating))
    except ValueError:
        pass

    if request.GET.get('hide_watched') == '1':
        watched_ids = Mark.objects.filter(user=request.user, kind='watched').values_list('movie_id', flat=True)
        movies = movies.exclude(id__in=watched_ids)

    ordering = request.GET.get('ordering', '-rating')
    if ordering not in ORDERINGS:
        ordering = '-rating'
    movies = movies.order_by(ordering, 'title')

    return make_page(request, movies)

@login_required
def api_movie_detail(request, pk):
    error = demo_options(request)
    if error:
        return error

    movie = Movie.objects.prefetch_related('genres').filter(pk=pk).first()
    if movie is None:
        return JsonResponse({'error': 'Фильм не найден'}, status=404)

    data = movie_to_dict(movie)
    data['country'] = movie.country
    data['duration'] = movie.duration
    data['description'] = movie.description

    avg_score, ratings_count = rating_stats(movie)
    data['avg_score'] = avg_score
    data['ratings_count'] = ratings_count

    marks = {}
    for kind in MARK_NAMES:
        marks[kind] = Mark.objects.filter(movie=movie, kind=kind).count()
    data['marks'] = marks

    my_marks = list(Mark.objects.filter(movie=movie, user=request.user).values_list('kind', flat=True))
    data['my_marks'] = my_marks

    data['reviews_count'] = movie.reviews.count()

    return JsonResponse(data)
