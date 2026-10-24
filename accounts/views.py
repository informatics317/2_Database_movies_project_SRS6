from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db.models import Avg, Count, Max, Min
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.views.decorators.http import require_POST

from .forms import MovieForm, RegisterForm, ReviewForm
from .models import Genre, Mark, Movie, Rating, Review

SORT_OPTIONS = {
    '-rating': 'Сначала с высоким рейтингом',
    'rating': 'Сначала с низким рейтингом',
    '-year': 'Сначала новые',
    'year': 'Сначала старые',
    'title': 'По названию (А–Я)',
}


MARK_NAMES = {
    'watch': 'Буду смотреть',
    'favorite': 'Любимые',
    'watched': 'Просмотрено',
}


def is_admin(user):
    return user.is_staff


def filter_movies(params, user, kind=''):
    movies = Movie.objects.all()

    if kind == 'all':
        movies = movies.filter(marks__user=user).distinct()
    elif kind in MARK_NAMES:
        movies = movies.filter(marks__user=user, marks__kind=kind)

    query = params.get('q', '').strip()
    if query != '':
        movies = movies.filter(search_index__contains=query.lower())

    genre_ids = []
    for part in params.get('genres', '').split(','):
        if part.isdigit():
            genre_ids.append(int(part))

    if len(genre_ids) > 0:
        if params.get('mode') == 'all':
            for genre_id in genre_ids:
                movies = movies.filter(genres__id=genre_id)
        else:
            movies = movies.filter(genres__id__in=genre_ids).distinct()

    countries = []
    for part in params.get('countries', '').split(','):
        if part.strip() != '':
            countries.append(part.strip())
    if len(countries) > 0:
        movies = movies.filter(country__in=countries)

    year_from = params.get('year_from', '')
    if year_from.isdigit():
        movies = movies.filter(year__gte=int(year_from))

    year_to = params.get('year_to', '')
    if year_to.isdigit():
        movies = movies.filter(year__lte=int(year_to))

    rating_min = params.get('rating_min', '')
    if rating_min.isdigit():
        movies = movies.filter(rating__gte=int(rating_min))

    duration = params.get('duration', '')
    if duration == 'short':
        movies = movies.filter(duration__lt=100)
    elif duration == 'medium':
        movies = movies.filter(duration__gte=100, duration__lte=150)
    elif duration == 'long':
        movies = movies.filter(duration__gt=150)

    sort = params.get('sort', '-rating')
    if sort not in SORT_OPTIONS:
        sort = '-rating'

    return movies.order_by(sort, 'title')


def add_marks(movies, user):
    watch_ids = Mark.objects.filter(user=user, kind='watch').values_list('movie_id', flat=True)
    favorite_ids = Mark.objects.filter(user=user, kind='favorite').values_list('movie_id', flat=True)
    watched_ids = Mark.objects.filter(user=user, kind='watched').values_list('movie_id', flat=True)

    movies = list(movies)
    for movie in movies:
        movie.marked_watch = movie.id in watch_ids
        movie.marked_favorite = movie.id in favorite_ids
        movie.marked_watched = movie.id in watched_ids
    return movies


def mark_counts(user):
    marks = Mark.objects.filter(user=user)
    return {
        'all': marks.values('movie').distinct().count(),
        'watch': marks.filter(kind='watch').count(),
        'favorite': marks.filter(kind='favorite').count(),
        'watched': marks.filter(kind='watched').count(),
    }


def rating_stats(movie):
    data = movie.ratings.aggregate(avg=Avg('score'), n=Count('id'))
    avg = None
    if data['avg']:
        avg = round(data['avg'], 1)
    return avg, data['n']


def register(request):
    if request.user.is_authenticated:
        return redirect('catalog')

    if request.method == 'POST':
        form = RegisterForm(request.POST)

        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Аккаунт создан. Добро пожаловать!')
            return redirect('catalog')
    else:
        form = RegisterForm()

    return render(
        request,
        'registration/register.html',
        {
            'form': form,
        }
    )



@login_required
def catalog(request):
    movies = filter_movies(request.GET, request.user)

    return render(
        request,
        'catalog.html',
        {
            'movies': add_marks(movies, request.user),
            'sort_options': SORT_OPTIONS,
            'total': Movie.objects.count(),
        }
    )



@login_required
def advanced_search(request):
    movies = filter_movies(request.GET, request.user)

    countries = Movie.objects.exclude(country='').values('country').annotate(n=Count('id')).order_by('country')
    years = Movie.objects.aggregate(first=Min('year'), last=Max('year'))

    return render(
        request,
        'advanced_search.html',
        {
            'movies': add_marks(movies, request.user),
            'sort_options': SORT_OPTIONS,
            'total': Movie.objects.count(),
            'genres': Genre.objects.annotate(n=Count('movies')),
            'countries': countries,
            'year_min': years['first'],
            'year_max': years['last'],
        }
    )


@login_required
def movie_detail(request, pk):
    movie = get_object_or_404(Movie, pk=pk)
    movie = add_marks([movie], request.user)[0]

    my_rating = Rating.objects.filter(user=request.user, movie=movie).first()
    my_score = None
    if my_rating:
        my_score = my_rating.score

    avg_score, ratings_count = rating_stats(movie)
    reviews = movie.reviews.order_by('-created_at', '-id')

    return render(
        request,
        'movie_detail.html',
        {
            'movie': movie,
            'reviews': reviews,
            'reviews_count': reviews.count(),
            'form': ReviewForm(),
            'my_score': my_score,
            'avg_score': avg_score,
            'ratings_count': ratings_count,
            'stars': range(1, 11),
        }
    )


@login_required
def movie_add(request):
    if not is_admin(request.user):
        messages.error(request, 'Добавлять фильмы может только администратор.')
        return redirect('catalog')

    if request.method == 'POST':
        form = MovieForm(request.POST, request.FILES)

        if form.is_valid():
            movie = form.save()
            messages.success(request, f'Фильм «{movie.title}» добавлен в каталог.')
            return redirect('movie_detail', pk=movie.pk)
    else:
        form = MovieForm()

    countries = Movie.objects.exclude(country='').values_list('country', flat=True).distinct().order_by('country')

    return render(
        request,
        'movie_form.html',
        {
            'form': form,
            'countries': countries,
        }
    )


@login_required
def movie_partial(request):
    kind = request.GET.get('kind', '')
    if kind != 'all' and kind not in MARK_NAMES:
        kind = ''

    movies = filter_movies(request.GET, request.user, kind)
    movies = add_marks(movies, request.user)

    html = render_to_string('components/movie_grid.html', {'movies': movies}, request=request)
    return JsonResponse({'html': html, 'count': len(movies)})


@login_required
@require_POST
def toggle_mark(request, pk, kind):
    if kind not in MARK_NAMES:
        return JsonResponse({'ok': False}, status=400)

    movie = get_object_or_404(Movie, pk=pk)
    mark, created = Mark.objects.get_or_create(user=request.user, movie=movie, kind=kind)
    if not created:
        mark.delete()

    return JsonResponse({'ok': True, 'active': created, 'counts': mark_counts(request.user)})


@login_required
@require_POST
def rate_movie(request, pk):
    movie = get_object_or_404(Movie, pk=pk)

    score = request.POST.get('score', '')
    if not score.isdigit() or int(score) < 1 or int(score) > 10:
        return JsonResponse({'ok': False}, status=400)
    score = int(score)

    my_rating = Rating.objects.filter(user=request.user, movie=movie).first()
    if my_rating and my_rating.score == score:
        my_rating.delete()
        my_score = None
    else:
        Rating.objects.update_or_create(user=request.user, movie=movie, defaults={'score': score})
        my_score = score

    avg_score, ratings_count = rating_stats(movie)
    return JsonResponse({
        'ok': True,
        'my_score': my_score,
        'avg_score': avg_score,
        'ratings_count': ratings_count,
    })


@login_required
@require_POST
def add_review(request, pk):
    movie = get_object_or_404(Movie, pk=pk)
    form = ReviewForm(request.POST)

    if not form.is_valid():
        return JsonResponse({'ok': False, 'error': 'Напишите текст отзыва.'}, status=400)

    review = form.save(commit=False)
    review.movie = movie
    review.user = request.user
    review.save()

    html = render_to_string('components/review_item.html', {'review': review}, request=request)
    return JsonResponse({'ok': True, 'html': html, 'reviews_count': movie.reviews.count()}, status=201)


@login_required
@require_POST
def delete_review(request, pk):
    review = get_object_or_404(Review, pk=pk)

    if review.user != request.user and not is_admin(request.user):
        return JsonResponse({'ok': False}, status=403)

    movie = review.movie
    review.delete()
    return JsonResponse({'ok': True, 'reviews_count': movie.reviews.count()})


@login_required
@require_POST
def delete_movie(request, pk):
    if not is_admin(request.user):
        return JsonResponse({'ok': False}, status=403)

    movie = get_object_or_404(Movie, pk=pk)
    title = movie.title
    if movie.poster:
        movie.poster.delete(save=False)    # вместе с фильмом удаляем файл обложки
    movie.delete()
    return JsonResponse({'ok': True, 'title': title, 'total': Movie.objects.count()})

