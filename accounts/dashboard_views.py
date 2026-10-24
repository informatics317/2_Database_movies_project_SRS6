from django.contrib.auth.decorators import login_required
from django.db.models import Avg, Count
from django.shortcuts import render

from .models import Genre, Movie, Rating, Review
from .views import MARK_NAMES, SORT_OPTIONS, add_marks, filter_movies, mark_counts

MY_PAGES = {
    'all': 'Все мои фильмы',
    'watch': 'Буду смотреть',
    'favorite': 'Любимые фильмы',
    'watched': 'Просмотрено',
}


@login_required
def my_movies(request, kind):
    movies = filter_movies(request.GET, request.user, kind)

    return render(
        request,
        'my_' + kind + '.html',
        {
            'movies': add_marks(movies, request.user),
            'sort_options': SORT_OPTIONS,
            'kind': kind,
            'counts': mark_counts(request.user),
            'page_title': MY_PAGES[kind],
        }
    )


@login_required
def stats(request):
    total = Movie.objects.count()
    avg_rating = Movie.objects.aggregate(a=Avg('rating'))['a'] or 0

    genre_stats = []
    for genre in Genre.objects.annotate(n=Count('movies')).order_by('-n', 'name'):
        percent = 0
        if total > 0:
            percent = round(genre.n * 100 / total)
        genre_stats.append({'name': genre.name, 'n': genre.n, 'percent': percent})

    score_labels = list(range(1, 11))
    score_numbers = []
    for score in score_labels:
        score_numbers.append(Rating.objects.filter(score=score).count())
    ratings_total = sum(score_numbers)

    if ratings_total == 0:
        chart_hint = 'Оценок пока нет. Поставьте первую на странице любого фильма.'
    else:
        popular_score = score_labels[score_numbers.index(max(score_numbers))]
        chart_hint = f'Чаще всего ставят {popular_score} из 10. Всего оценок: {ratings_total}.'

    return render(
        request,
        'stats.html',
        {
            'total_movies': total,
            'avg_rating': avg_rating,
            'ratings_total': ratings_total,
            'reviews_total': Review.objects.count(),
            'genre_stats': genre_stats,
            'score_labels': score_labels,
            'score_numbers': score_numbers,
            'chart_hint': chart_hint,
            'top_movies': Movie.objects.order_by('-rating', 'title')[:5],
        }
    )
