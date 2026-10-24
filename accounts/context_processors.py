from .models import Mark

def my_movies_count(request):
    if not request.user.is_authenticated:
        return {'my_movies_count': 0}

    count = Mark.objects.filter(user=request.user).values('movie').distinct().count()
    return {'my_movies_count': count}
