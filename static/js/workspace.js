let genre = loadValue('ws_genre', '');
let maxDuration = loadValue('ws_duration', '');
let minRating = loadValue('ws_rating', '');
let hideWatched = loadValue('ws_hide', '0');
let ordering = loadValue('ws_ordering', '-rating');
let page = parseInt(loadValue('ws_page', '1'));

let filmA = loadValue('ws_slot_a', '');
let filmB = loadValue('ws_slot_b', '');

let movieA = null;
let movieB = null;

let totalPages = 1;

const pageParams = new URLSearchParams(window.location.search);
const demoDelay = pageParams.get('delay');
const demoError = pageParams.get('error');


const genreSelect = document.getElementById('ws-genre');
const durationSelect = document.getElementById('ws-duration');
const ratingSelect = document.getElementById('ws-rating');
const orderingSelect = document.getElementById('ws-ordering');
const hideCheckbox = document.getElementById('ws-hide');
const resetButton = document.getElementById('ws-reset');
const countText = document.getElementById('ws-count');
const listBox = document.getElementById('ws-list');
const pager = document.getElementById('ws-pager');
const prevButton = document.getElementById('ws-prev');
const nextButton = document.getElementById('ws-next');
const pageInfo = document.getElementById('ws-page-info');
const compareBox = document.getElementById('ws-compare');

const inputA = document.getElementById('slot-a-input');
const suggestBoxA = document.getElementById('slot-a-suggest');
const bodyA = document.getElementById('slot-a-body');

const inputB = document.getElementById('slot-b-input');
const suggestBoxB = document.getElementById('slot-b-suggest');
const bodyB = document.getElementById('slot-b-body');


function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function posterStyle(movie) {
    if (movie.poster) {
        return "background-image: url('" + movie.poster + "');";
    }
    return 'background: linear-gradient(135deg, hsl(' + movie.hue + ', 65%, 42%), hsl(' + movie.hue_2 + ', 65%, 26%));';
}

function addDemo(url) {
    if (demoDelay) {
        url += '&delay=' + demoDelay;
    }
    if (demoError) {
        url += '&error=' + demoError;
    }
    return url;
}

function genreBadges(movie) {
    let html = '';
    for (const name of movie.genres) {
        html += '<span class="badge bg-blue-lt me-1">' + esc(name) + '</span>';
    }
    return html;
}

function showLoading(box, text) {
    box.innerHTML =
        '<div class="text-center py-4">' +
        '<div class="spinner-border text-primary mb-2" role="status"></div>' +
        '<div class="text-secondary">' + text + '</div>' +
        '</div>';
}

function showEmpty(box, title, text) {
    box.innerHTML =
        '<div class="text-center py-4">' +
        '<div style="font-size: 2.5rem;">🎞️</div>' +
        '<h4 class="mt-2">' + title + '</h4>' +
        '<div class="text-secondary">' + text + '</div>' +
        '</div>';
}

function showError(box, message, retryFunction) {
    box.innerHTML =
        '<div class="alert alert-danger mb-0" role="alert">' +
        '<h4 class="alert-title">Не удалось загрузить данные</h4>' +
        '<div class="mb-3">' + esc(message) + '</div>' +
        '<button type="button" class="btn btn-danger btn-sm retry-button">Повторить</button>' +
        '</div>';
    box.querySelector('.retry-button').addEventListener('click', retryFunction);
}

let listController = null;
let listRequestId = 0;

async function loadList() {
    if (listController) {
        listController.abort();
    }
    listController = new AbortController();

    listRequestId += 1;
    const myId = listRequestId;

    let url = '/api/recommend/?genre=' + genre +
        '&max_duration=' + maxDuration +
        '&min_rating=' + minRating +
        '&hide_watched=' + hideWatched +
        '&ordering=' + ordering +
        '&page=' + page;
    url = addDemo(url);

    showLoading(listBox, 'Подбираем фильмы...');

    try {
        const response = await fetch(url, { signal: listController.signal });
        if (!response.ok) {
            throw new Error('Сервер ответил с ошибкой (код ' + response.status + ').');
        }
        const data = await response.json();

        if (myId !== listRequestId) {
            return;
        }

        page = data.page;
        saveValue('ws_page', page);
        showMovies(data);

    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }
        if (myId !== listRequestId) {
            return;
        }
        countText.textContent = '0';
        pager.classList.add('d-none');
        showError(listBox, error.message, loadList);
    }
}

function showMovies(data) {
    totalPages = data.pages;
    countText.textContent = data.count;
    pageInfo.textContent = 'Вариант ' + data.page + ' из ' + data.pages;
    prevButton.disabled = data.page <= 1;
    nextButton.disabled = data.pages <= 1;

    if (data.results.length === 0) {
        showEmpty(listBox, 'Ничего не найдено', 'Попробуйте смягчить условия: другой жанр, больше минут, ниже рейтинг.');
        pager.classList.add('d-none');
        return;
    }
    pager.classList.remove('d-none');

    let html = '<div class="list-group">';
    for (const movie of data.results) {
        html +=
            '<div class="list-group-item">' +
            '<div class="d-flex gap-3">' +
            '<div class="ws-thumb" style="' + posterStyle(movie) + '"></div>' +
            '<div class="flex-fill">' +
            '<div class="d-flex justify-content-between gap-2">' +
            '<strong>' + esc(movie.title) + '</strong>' +
            '<span class="badge bg-yellow-lt">★ ' + movie.rating + '</span>' +
            '</div>' +
            '<div class="text-secondary small">' + movie.year + ' · ' + movie.duration + ' мин · ' + esc(movie.director) + '</div>' +
            '<div class="mt-1">' + genreBadges(movie) + '</div>' +
            '<button type="button" class="btn btn-sm btn-outline-primary mt-2 compare-button" data-id="' + movie.id + '">Сравнить</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    html += '</div>';
    listBox.innerHTML = html;

    for (const button of listBox.querySelectorAll('.compare-button')) {
        button.addEventListener('click', onCompareClick);
    }
}

function onCompareClick(event) {
    const id = event.currentTarget.dataset.id;

    if (filmA === id || filmB === id) {
        showToast('Этот фильм уже есть в сравнении', 'warning');
        return;
    }

    if (filmA === '') {
        chooseFilmA(id);
    } else {
        chooseFilmB(id);
    }
}

let requestIdA = 0;
let requestIdB = 0;

function chooseFilmA(id) {
    filmA = String(id);
    saveValue('ws_slot_a', filmA);
    loadFilmA();
}

function clearFilmA() {
    requestIdA += 1;
    filmA = '';
    saveValue('ws_slot_a', '');
    movieA = null;
    showHintA();
    updateCompare();
}

function showHintA() {
    showEmpty(bodyA, 'Фильм не выбран', 'Найдите фильм по названию или нажмите «Сравнить» в списке слева.');
}

async function loadFilmA() {
    requestIdA += 1;
    const myId = requestIdA;

    const url = addDemo('/api/movies/' + filmA + '/?');

    movieA = null;
    updateCompare();
    showLoading(bodyA, 'Загружаем карточку...');

    try {
        const response = await fetch(url);

        if (response.status === 404) {
            if (myId === requestIdA) {
                filmA = '';
                saveValue('ws_slot_a', '');
                showEmpty(bodyA, 'Фильм не найден', 'Возможно, его удалили. Выберите другой.');
            }
            return;
        }
        if (!response.ok) {
            throw new Error('Сервер ответил с ошибкой (код ' + response.status + ').');
        }
        const movie = await response.json();

        if (myId !== requestIdA) {
            return;
        }

        movieA = movie;
        bodyA.innerHTML = filmCardHtml(movie);
        bodyA.querySelector('.clear-button').addEventListener('click', clearFilmA);
        updateCompare();

    } catch (error) {
        if (myId !== requestIdA) {
            return;
        }
        showError(bodyA, error.message, loadFilmA);
    }
}

function chooseFilmB(id) {
    filmB = String(id);
    saveValue('ws_slot_b', filmB);
    loadFilmB();
}

function clearFilmB() {
    requestIdB += 1;
    filmB = '';
    saveValue('ws_slot_b', '');
    movieB = null;
    showHintB();
    updateCompare();
}

function showHintB() {
    showEmpty(bodyB, 'Фильм не выбран', 'Найдите фильм по названию или нажмите «Сравнить» в списке слева.');
}

async function loadFilmB() {
    requestIdB += 1;
    const myId = requestIdB;

    const url = addDemo('/api/movies/' + filmB + '/?');

    movieB = null;
    updateCompare();
    showLoading(bodyB, 'Загружаем карточку...');

    try {
        const response = await fetch(url);

        if (response.status === 404) {
            if (myId === requestIdB) {
                filmB = '';
                saveValue('ws_slot_b', '');
                showEmpty(bodyB, 'Фильм не найден', 'Возможно, его удалили. Выберите другой.');
            }
            return;
        }
        if (!response.ok) {
            throw new Error('Сервер ответил с ошибкой (код ' + response.status + ').');
        }
        const movie = await response.json();

        if (myId !== requestIdB) {
            return;
        }

        movieB = movie;
        bodyB.innerHTML = filmCardHtml(movie);
        bodyB.querySelector('.clear-button').addEventListener('click', clearFilmB);
        updateCompare();

    } catch (error) {
        if (myId !== requestIdB) {
            return;
        }
        showError(bodyB, error.message, loadFilmB);
    }
}

function filmCardHtml(movie) {
    let avg = 'пока нет оценок';
    if (movie.avg_score) {
        avg = movie.avg_score + ' / 10 (оценок: ' + movie.ratings_count + ')';
    }

    let description = 'Описания пока нет.';
    if (movie.description) {
        description = esc(movie.description);
    }

    let myMarks = '<span class="text-secondary">нет</span>';
    if (movie.my_marks.length > 0) {
        myMarks = '';
        const names = { watch: 'Буду смотреть', favorite: 'Любимое', watched: 'Просмотрено' };
        for (const kind of movie.my_marks) {
            myMarks += '<span class="badge bg-green-lt me-1">' + names[kind] + '</span>';
        }
    }

    return '<div class="d-flex gap-3 mb-2">' +
        '<div class="ws-thumb" style="' + posterStyle(movie) + '"></div>' +
        '<div>' +
        '<h4 class="mb-1">' + esc(movie.title) + '</h4>' +
        '<div class="mb-1">' + genreBadges(movie) + '</div>' +
        '<div class="text-secondary small">' + movie.year + ' · ' + esc(movie.country) + ' · ' + movie.duration + ' мин</div>' +
        '</div>' +
        '</div>' +
        '<div class="small mb-1">Оценка пользователей: <strong>' + avg + '</strong></div>' +
        '<div class="small mb-2">Мои отметки: ' + myMarks + '</div>' +
        '<p class="small text-secondary mb-2">' + description + '</p>' +
        '<a href="/movies/' + movie.id + '/" class="btn btn-sm btn-outline-primary me-1">Открыть страницу</a>' +
        '<button type="button" class="btn btn-sm btn-outline-secondary clear-button">Очистить</button>';
}


function betterOf(valueA, valueB) {
    if (valueA > valueB) {
        return 'a';
    }
    if (valueB > valueA) {
        return 'b';
    }
    return '';
}

function updateCompare() {
    if (movieA === null || movieB === null) {
        compareBox.innerHTML =
            '<div class="card"><div class="card-body">' +
            '<div class="text-secondary text-center">Выберите два фильма, и здесь появится таблица сравнения.</div>' +
            '</div></div>';
        return;
    }

    const a = movieA;
    const b = movieB;

    const rows = [
        ['Год выпуска', a.year, b.year, ''],
        ['Страна', esc(a.country), esc(b.country), ''],
        ['Режиссёр', esc(a.director), esc(b.director), ''],
        ['Длительность, мин', a.duration, b.duration, ''],
        ['Рейтинг каталога', a.rating, b.rating, betterOf(parseFloat(a.rating), parseFloat(b.rating))],
        ['Оценка пользователей', a.avg_score || '—', b.avg_score || '—', betterOf(Number(a.avg_score), Number(b.avg_score))],
        ['Количество оценок', a.ratings_count, b.ratings_count, betterOf(a.ratings_count, b.ratings_count)],
        ['Отзывов', a.reviews_count, b.reviews_count, betterOf(a.reviews_count, b.reviews_count)],
        ['В любимых у людей', a.marks.favorite, b.marks.favorite, betterOf(a.marks.favorite, b.marks.favorite)],
        ['Хотят посмотреть', a.marks.watch, b.marks.watch, betterOf(a.marks.watch, b.marks.watch)],
        ['Уже посмотрели', a.marks.watched, b.marks.watched, betterOf(a.marks.watched, b.marks.watched)],
    ];

    let html =
        '<div class="card"><div class="card-header"><h4 class="card-title">Сравнение</h4></div>' +
        '<div class="table-responsive"><table class="table table-vcenter card-table">' +
        '<thead><tr><th></th><th>' + esc(a.title) + '</th><th>' + esc(b.title) + '</th></tr></thead><tbody>';

    for (const row of rows) {
        let classA = '';
        let classB = '';
        if (row[3] === 'a') {
            classA = ' class="bg-green-lt fw-bold"';
        }
        if (row[3] === 'b') {
            classB = ' class="bg-green-lt fw-bold"';
        }
        html += '<tr><td class="text-secondary">' + row[0] + '</td><td' + classA + '>' + row[1] + '</td><td' + classB + '>' + row[2] + '</td></tr>';
    }

    html +=
        '</tbody></table></div>' +
        '<div class="card-footer text-secondary small">Зелёным выделено лучшее (большее) значение.</div></div>';
    compareBox.innerHTML = html;
}

let suggestIdA = 0;
let suggestIdB = 0;
let timerA = null;
let timerB = null;

function suggestHtml(movies) {
    if (movies.length === 0) {
        return '<div class="list-group"><div class="list-group-item text-secondary">Ничего не найдено</div></div>';
    }
    let html = '<div class="list-group">';
    for (const movie of movies) {
        html +=
            '<button type="button" class="list-group-item list-group-item-action suggest-item" data-id="' + movie.id + '">' +
            esc(movie.title) + ' <span class="text-secondary">(' + movie.year + ')</span>' +
            '</button>';
    }
    html += '</div>';
    return html;
}

async function searchA() {
    const text = inputA.value.trim();
    suggestIdA += 1;
    const myId = suggestIdA;

    if (text === '') {
        suggestBoxA.innerHTML = '';
        return;
    }

    const url = addDemo('/api/movies/?search=' + encodeURIComponent(text));
    suggestBoxA.innerHTML = '<div class="list-group"><div class="list-group-item text-secondary">Ищем...</div></div>';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('ошибка ' + response.status);
        }
        const data = await response.json();

        if (myId !== suggestIdA) {
            return;
        }

        suggestBoxA.innerHTML = suggestHtml(data.results);
        for (const item of suggestBoxA.querySelectorAll('.suggest-item')) {
            item.addEventListener('click', function () {
                chooseFilmA(item.dataset.id);
                inputA.value = '';
                suggestBoxA.innerHTML = '';
            });
        }

    } catch (error) {
        if (myId !== suggestIdA) {
            return;
        }
        suggestBoxA.innerHTML = '<div class="list-group"><div class="list-group-item text-danger">Не удалось выполнить поиск</div></div>';
    }
}

async function searchB() {
    const text = inputB.value.trim();
    suggestIdB += 1;
    const myId = suggestIdB;

    if (text === '') {
        suggestBoxB.innerHTML = '';
        return;
    }

    const url = addDemo('/api/movies/?search=' + encodeURIComponent(text));
    suggestBoxB.innerHTML = '<div class="list-group"><div class="list-group-item text-secondary">Ищем...</div></div>';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('ошибка ' + response.status);
        }
        const data = await response.json();

        if (myId !== suggestIdB) {
            return;
        }

        suggestBoxB.innerHTML = suggestHtml(data.results);
        for (const item of suggestBoxB.querySelectorAll('.suggest-item')) {
            item.addEventListener('click', function () {
                chooseFilmB(item.dataset.id);
                inputB.value = '';
                suggestBoxB.innerHTML = '';
            });
        }

    } catch (error) {
        if (myId !== suggestIdB) {
            return;
        }
        suggestBoxB.innerHTML = '<div class="list-group"><div class="list-group-item text-danger">Не удалось выполнить поиск</div></div>';
    }
}


async function loadGenres() {
    try {
        const response = await fetch('/api/genres/');
        const data = await response.json();
        for (const item of data.results) {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name + ' (' + item.count + ')';
            genreSelect.appendChild(option);
        }
        genreSelect.value = genre;
    } catch (error) {
        console.log('Жанры не загрузились', error);
    }
}


function settingsChanged() {
    genre = genreSelect.value;
    maxDuration = durationSelect.value;
    minRating = ratingSelect.value;
    ordering = orderingSelect.value;
    if (hideCheckbox.checked) {
        hideWatched = '1';
    } else {
        hideWatched = '0';
    }
    page = 1;

    saveValue('ws_genre', genre);
    saveValue('ws_duration', maxDuration);
    saveValue('ws_rating', minRating);
    saveValue('ws_ordering', ordering);
    saveValue('ws_hide', hideWatched);
    saveValue('ws_page', page);
    loadList();
}

genreSelect.addEventListener('change', settingsChanged);
durationSelect.addEventListener('change', settingsChanged);
ratingSelect.addEventListener('change', settingsChanged);
orderingSelect.addEventListener('change', settingsChanged);
hideCheckbox.addEventListener('change', settingsChanged);

prevButton.addEventListener('click', function () {
    page -= 1;
    saveValue('ws_page', page);
    loadList();
});

nextButton.addEventListener('click', function () {
    page += 1;
    if (page > totalPages) {
        page = 1;
    }
    saveValue('ws_page', page);
    loadList();
});

resetButton.addEventListener('click', function () {
    genreSelect.value = '';
    durationSelect.value = '';
    ratingSelect.value = '';
    orderingSelect.value = '-rating';
    hideCheckbox.checked = false;
    settingsChanged();
});

inputA.addEventListener('input', function () {
    clearTimeout(timerA);
    timerA = setTimeout(searchA, 300);
});
inputB.addEventListener('input', function () {
    clearTimeout(timerB);
    timerB = setTimeout(searchB, 300);
});


async function startPage() {
    durationSelect.value = maxDuration;
    ratingSelect.value = minRating;
    orderingSelect.value = ordering;
    hideCheckbox.checked = (hideWatched === '1');

    if (filmA !== '') {
        loadFilmA();
    } else {
        showHintA();
    }
    if (filmB !== '') {
        loadFilmB();
    } else {
        showHintB();
    }
    updateCompare();

    await loadGenres();
    loadList();
}

startPage();

