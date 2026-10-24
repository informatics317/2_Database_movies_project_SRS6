from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.core.validators import MaxValueValidator, MinValueValidator
from .models import (
    Genre,
    Movie,
    Review,
)


class RegisterForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs['class'] = 'form-control'


class ReviewForm(forms.ModelForm):
    class Meta:
        model = Review
        fields = ['text']
        labels = {
            'text': 'Ваш отзыв',
        }
        widgets = {
            'text': forms.Textarea(
                attrs={
                    'class': 'form-control',
                    'rows': 4,
                    'maxlength': 1000,
                    'placeholder': 'Поделитесь впечатлениями о фильме',
                }
            ),
        }


class MovieForm(forms.ModelForm):
    year = forms.IntegerField(
        label='Год выхода',
        validators=[MinValueValidator(1888), MaxValueValidator(2100)],
        widget=forms.NumberInput(
            attrs={
                'class': 'form-control'
            }
        ),
    )

    genres = forms.ModelMultipleChoiceField(
        label='Жанры',
        queryset=Genre.objects.all(),
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = Movie
        fields = [
            'title',
            'original_title',
            'year',
            'country',
            'director',
            'duration',
            'rating',
            'description',
            'poster',
            'poster_url',
            'genres',
        ]
        labels = {
            'title': 'Название',
            'original_title': 'Оригинальное название',
            'country': 'Страна',
            'director': 'Режиссёр',
            'duration': 'Длительность, мин',
            'rating': 'Рейтинг (от 0 до 10)',
            'description': 'Описание',
            'poster': 'Обложка (файл с компьютера)',
            'poster_url': 'или ссылка на картинку',
        }
        widgets = {
            'title': forms.TextInput(
                attrs={
                    'class': 'form-control'
                }
            ),
            'original_title': forms.TextInput(
                attrs={
                    'class': 'form-control'
                }
            ),
            'country': forms.TextInput(
                attrs={
                    'class': 'form-control',
                    'list': 'countries-list',
                }
            ),
            'director': forms.TextInput(
                attrs={
                    'class': 'form-control'
                }
            ),
            'duration': forms.NumberInput(
                attrs={
                    'class': 'form-control',
                    'min': 1,
                }
            ),
            'rating': forms.NumberInput(
                attrs={
                    'class': 'form-control',
                    'step': '0.1',
                    'min': 0,
                    'max': 10,
                }
            ),
            'description': forms.Textarea(
                attrs={
                    'class': 'form-control',
                    'rows': 4,
                }
            ),
            'poster': forms.FileInput(
                attrs={
                    'class': 'form-control',
                    'accept': 'image/*',
                }
            ),
            'poster_url': forms.URLInput(
                attrs={
                    'class': 'form-control',
                    'placeholder': 'https://...',
                }
            ),
        }

    def clean_poster(self):
        poster = self.cleaned_data.get('poster')
        if poster and poster.size > 5 * 1024 * 1024:
            raise forms.ValidationError('Файл слишком большой. Выберите картинку до 5 МБ.')
        return poster
