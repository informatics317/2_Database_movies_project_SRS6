from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models



class Genre(models.Model):
    name = models.CharField('Название', max_length=50, unique=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'жанр'
        verbose_name_plural = 'жанры'

    def __str__(self):
        return self.name



class Movie(models.Model):
    title = models.CharField('Название', max_length=200)
    original_title = models.CharField('Оригинальное название', max_length=200, blank=True)
    year = models.PositiveSmallIntegerField('Год выхода')
    director = models.CharField('Режиссёр', max_length=200)
    duration = models.PositiveSmallIntegerField('Длительность, мин')
    rating = models.DecimalField(
        'Рейтинг', max_digits=3, decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    description = models.TextField('Описание', blank=True)
    country = models.CharField('Страна', max_length=60, blank=True)
    poster_url = models.URLField('Ссылка на постер', blank=True)
    poster = models.ImageField('Обложка (файл)', upload_to='posters/', blank=True)
    genres = models.ManyToManyField(Genre, related_name='movies', verbose_name='Жанры')

    search_index = models.CharField(max_length=600, blank=True, editable=False)

    class Meta:
        ordering = ['-rating', 'title']
        verbose_name = 'фильм'
        verbose_name_plural = 'фильмы'

    def __str__(self):
        return f'{self.title} ({self.year})'

    def save(self, *args, **kwargs):
        self.search_index = f'{self.title} {self.original_title} {self.director}'.lower()
        super().save(*args, **kwargs)


    @property
    def poster_src(self):
        if self.poster:
            return self.poster.url
        return self.poster_url


    @property
    def hue(self):
        return (self.pk or 0) * 47 % 360

    @property
    def hue_2(self):
        return (self.hue + 40) % 360


MARK_KINDS = [
    ('watch', 'Буду смотреть'),
    ('favorite', 'Любимые'),
    ('watched', 'Просмотрено'),
]


class Mark(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='marks')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='marks')
    kind = models.CharField('Вид отметки', max_length=10, choices=MARK_KINDS)
    created_at = models.DateTimeField('Создана', auto_now_add=True)

    class Meta:
        unique_together = ('user', 'movie', 'kind')
        verbose_name = 'отметка'
        verbose_name_plural = 'отметки'

    def __str__(self):
        return f'{self.user.username}: {self.kind} — {self.movie.title}'


class Rating(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ratings')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='ratings')
    score = models.PositiveSmallIntegerField(
        'Оценка',
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )

    class Meta:
        unique_together = ('user', 'movie')
        verbose_name = 'оценка'
        verbose_name_plural = 'оценки'

    def __str__(self):
        return f'{self.user.username}: {self.score}/10 — {self.movie.title}'


class Review(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    text = models.TextField('Текст отзыва', max_length=1000)
    created_at = models.DateTimeField('Создан', auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        verbose_name = 'отзыв'
        verbose_name_plural = 'отзывы'

    def __str__(self):
        return f'{self.user.username} — {self.movie.title}'
