const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

function saveValue(key, value) {
    localStorage.setItem('movies.' + key, value);
}

function loadValue(key, defaultValue) {
    const value = localStorage.getItem('movies.' + key);
    if (value === null) {
        return defaultValue;
    }
    return value;
}

function showToast(message, type) {
    const box = document.getElementById('toast-box');
    const toast = document.createElement('div');
    toast.className = 'alert alert-' + (type || 'success') + ' shadow mb-0';
    toast.textContent = message;
    box.appendChild(toast);
    setTimeout(function () {
        toast.remove();
    }, 2500);
}

function postRequest(url, formData) {
    return fetch(url, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
        body: formData || null,
    }).then(function (response) {
        return response.json().then(function (data) {
            return { ok: response.ok, data: data };
        });
    });
}


const themeButton = document.getElementById('theme-toggle');

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (!themeButton) {
        return;
    }
    if (theme === 'dark') {
        themeButton.textContent = '☀️';
    } else {
        themeButton.textContent = '🌙';
    }
}

setTheme(loadValue('theme', 'light'));

if (themeButton) {
    themeButton.addEventListener('click', function () {
        let newTheme = 'dark';
        if (document.documentElement.getAttribute('data-bs-theme') === 'dark') {
            newTheme = 'light';
        }
        setTheme(newTheme);
        saveValue('theme', newTheme);
    });
}


function connectButtons(container) {
    const markButtons = container.querySelectorAll('[data-mark]');
    for (let i = 0; i < markButtons.length; i++) {
        markButtons[i].addEventListener('click', onMarkClick);
    }

    const deleteButtons = container.querySelectorAll('[data-delete-movie]');
    for (let i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].addEventListener('click', onDeleteMovieClick);
    }
}

function onMarkClick(event) {
    const button = event.currentTarget;

    postRequest(button.dataset.url).then(function (result) {
        if (!result.ok) {
            showToast('Не удалось изменить отметку', 'danger');
            return;
        }

        const color = button.dataset.color;
        const selector = '[data-mark="' + button.dataset.mark + '"][data-movie="' + button.dataset.movie + '"]';
        const sameButtons = document.querySelectorAll(selector);
        for (let i = 0; i < sameButtons.length; i++) {
            if (result.data.active) {
                sameButtons[i].classList.remove('btn-outline-' + color);
                sameButtons[i].classList.add('btn-' + color);
            } else {
                sameButtons[i].classList.remove('btn-' + color);
                sameButtons[i].classList.add('btn-outline-' + color);
            }
        }

        document.getElementById('my-count').textContent = result.data.counts.all;
        const badges = document.querySelectorAll('[data-count]');
        for (let i = 0; i < badges.length; i++) {
            badges[i].textContent = result.data.counts[badges[i].dataset.count];
        }

        if (result.data.active) {
            showToast('Отметка добавлена');
        } else {
            showToast('Отметка снята');
        }

        if (catalogRoot && catalogRoot.dataset.kind !== '') {
            loadMovies();
        }
    }).catch(function () {
        showToast('Не удалось изменить отметку', 'danger');
    });
}

function onDeleteMovieClick(event) {
    const button = event.currentTarget;

    if (!confirm('Удалить фильм «' + button.dataset.title + '»? Оценки и отзывы к нему тоже удалятся.')) {
        return;
    }

    postRequest(button.dataset.url).then(function (result) {
        if (!result.ok) {
            showToast('Не удалось удалить фильм', 'danger');
            return;
        }

        if (button.dataset.redirect) {
            window.location.href = button.dataset.redirect;
            return;
        }

        const total = document.getElementById('total-count');
        if (total) {
            total.textContent = result.data.total;
        }
        loadMovies();
        showToast('Фильм удалён из каталога');
    }).catch(function () {
        showToast('Не удалось удалить фильм', 'danger');
    });
}

connectButtons(document);


const catalogRoot = document.getElementById('catalog-root');

let loadMovies = function () {};

if (catalogRoot) {
    const grid = document.getElementById('movie-grid');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const resultsCount = document.getElementById('results-count');

    function getChecked(className) {
        const boxes = document.querySelectorAll('.' + className);
        const values = [];
        for (let i = 0; i < boxes.length; i++) {
            if (boxes[i].checked) {
                values.push(boxes[i].value);
            }
        }
        return values;
    }

    function getValue(id) {
        const field = document.getElementById(id);
        if (field) {
            return field.value;
        }
        return '';
    }

    function setValue(id, value) {
        const field = document.getElementById(id);
        if (field) {
            field.value = value;
        }
    }

    function setChecked(className, values) {
        const boxes = document.querySelectorAll('.' + className);
        for (let i = 0; i < boxes.length; i++) {
            boxes[i].checked = values.includes(boxes[i].value);
        }
    }

    function showSelectedCount() {
        const counter = document.getElementById('filters-selected');
        if (!counter) {
            return;
        }
        let count = getChecked('genre-check').length + getChecked('country-check').length;
        const ids = ['year-from', 'year-to', 'rating-min', 'duration'];
        for (let i = 0; i < ids.length; i++) {
            if (getValue(ids[i]) !== '') {
                count = count + 1;
            }
        }
        counter.textContent = count;
    }

    function saveFilters() {
        saveValue('sort', sortSelect.value);
        saveValue('genres', getChecked('genre-check').join(','));
        saveValue('countries', getChecked('country-check').join(','));
        saveValue('mode', getValue('genre-mode'));
        saveValue('year_from', getValue('year-from'));
        saveValue('year_to', getValue('year-to'));
        saveValue('rating_min', getValue('rating-min'));
        saveValue('duration', getValue('duration'));
    }

    function restoreFilters() {
        sortSelect.value = loadValue('sort', '-rating');
        setChecked('genre-check', loadValue('genres', '').split(','));
        setChecked('country-check', loadValue('countries', '').split(','));
        setValue('genre-mode', loadValue('mode', 'any'));
        setValue('year-from', loadValue('year_from', ''));
        setValue('year-to', loadValue('year_to', ''));
        setValue('rating-min', loadValue('rating_min', ''));
        setValue('duration', loadValue('duration', ''));
    }

    loadMovies = function () {
        const params = new URLSearchParams();
        params.append('q', searchInput.value);
        params.append('sort', sortSelect.value);
        params.append('kind', catalogRoot.dataset.kind);
        params.append('genres', getChecked('genre-check').join(','));
        params.append('mode', getValue('genre-mode'));
        params.append('countries', getChecked('country-check').join(','));
        params.append('year_from', getValue('year-from'));
        params.append('year_to', getValue('year-to'));
        params.append('rating_min', getValue('rating-min'));
        params.append('duration', getValue('duration'));

        fetch(catalogRoot.dataset.partialUrl + '?' + params.toString())
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                grid.innerHTML = data.html;
                resultsCount.textContent = data.count;
                connectButtons(grid);
            })
            .catch(function () {
                showToast('Не удалось загрузить список фильмов', 'danger');
            });
    };

    function onFiltersChange() {
        saveFilters();
        showSelectedCount();
        loadMovies();
    }

    function setView(mode) {
        if (mode === 'list') {
            grid.classList.add('view-list');
            grid.classList.remove('view-grid');
        } else {
            grid.classList.add('view-grid');
            grid.classList.remove('view-list');
        }
        const viewButtons = document.querySelectorAll('[data-view]');
        for (let i = 0; i < viewButtons.length; i++) {
            if (viewButtons[i].dataset.view === mode) {
                viewButtons[i].classList.add('active');
            } else {
                viewButtons[i].classList.remove('active');
            }
        }
    }

    const viewButtons = document.querySelectorAll('[data-view]');
    for (let i = 0; i < viewButtons.length; i++) {
        viewButtons[i].addEventListener('click', function (event) {
            const mode = event.currentTarget.dataset.view;
            setView(mode);
            saveValue('view', mode);
        });
    }

    searchInput.addEventListener('input', loadMovies);
    sortSelect.addEventListener('change', onFiltersChange);

    const checkClasses = ['genre-check', 'country-check'];
    for (let i = 0; i < checkClasses.length; i++) {
        const boxes = document.querySelectorAll('.' + checkClasses[i]);
        for (let j = 0; j < boxes.length; j++) {
            boxes[j].addEventListener('change', onFiltersChange);
        }
    }
    const fieldIds = ['genre-mode', 'year-from', 'year-to', 'rating-min', 'duration'];
    for (let i = 0; i < fieldIds.length; i++) {
        const field = document.getElementById(fieldIds[i]);
        if (field) {
            field.addEventListener('input', onFiltersChange);
        }
    }

    document.getElementById('reset-filters').addEventListener('click', function () {
        searchInput.value = '';
        sortSelect.value = '-rating';
        setChecked('genre-check', []);
        setChecked('country-check', []);
        setValue('genre-mode', 'any');
        setValue('year-from', '');
        setValue('year-to', '');
        setValue('rating-min', '');
        setValue('duration', '');
        onFiltersChange();
    });

    setView(loadValue('view', 'grid'));
    restoreFilters();
    showSelectedCount();
    loadMovies();
}


const ratingBox = document.getElementById('rating-box');

if (ratingBox) {
    const stars = ratingBox.querySelectorAll('.star');

    for (let i = 0; i < stars.length; i++) {
        stars[i].addEventListener('click', function (event) {
            const body = new FormData();
            body.append('score', event.currentTarget.dataset.score);

            postRequest(ratingBox.dataset.url, body).then(function (result) {
                if (!result.ok) {
                    showToast('Не удалось сохранить оценку', 'danger');
                    return;
                }

                const myScore = result.data.my_score;


                for (let j = 0; j < stars.length; j++) {
                    if (myScore !== null && Number(stars[j].dataset.score) <= myScore) {
                        stars[j].classList.add('active');
                    } else {
                        stars[j].classList.remove('active');
                    }
                }

                const myScoreText = document.getElementById('my-score-text');
                if (myScore === null) {
                    myScoreText.textContent = 'Вы ещё не оценили этот фильм';
                    showToast('Оценка снята');
                } else {
                    myScoreText.innerHTML = 'Ваша оценка: <strong>' + myScore + '</strong> из 10';
                    showToast('Оценка сохранена');
                }


                const avgText = document.getElementById('avg-score');
                if (result.data.avg_score === null) {
                    avgText.textContent = '—';
                } else {
                    avgText.textContent = result.data.avg_score.toFixed(1).replace('.', ',');
                }
                document.getElementById('ratings-count').textContent = result.data.ratings_count;
            }).catch(function () {
                showToast('Не удалось сохранить оценку', 'danger');
            });
        });
    }
}



function updateReviewCount(count) {
    document.getElementById('reviews-count').textContent = count;
    if (count > 0) {
        document.getElementById('no-reviews').classList.add('d-none');
    } else {
        document.getElementById('no-reviews').classList.remove('d-none');
    }
}

function onDeleteReviewClick(event) {
    const button = event.currentTarget;

    if (!confirm('Удалить отзыв?')) {
        return;
    }

    postRequest(button.dataset.url).then(function (result) {
        if (!result.ok) {
            showToast('Не удалось удалить отзыв', 'danger');
            return;
        }
        button.closest('.review-item').remove();
        updateReviewCount(result.data.reviews_count);
        showToast('Отзыв удалён');
    }).catch(function () {
        showToast('Не удалось удалить отзыв', 'danger');
    });
}


function connectReviewButtons(container) {
    const buttons = container.querySelectorAll('[data-delete-review]');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', onDeleteReviewClick);
    }
}
connectReviewButtons(document);

const reviewForm = document.getElementById('review-form');

if (reviewForm) {
    const errorBox = document.getElementById('review-errors');
    const reviewsList = document.getElementById('reviews-list');

    reviewForm.addEventListener('submit', function (event) {
        event.preventDefault();
        errorBox.classList.add('d-none');

        postRequest(reviewForm.action, new FormData(reviewForm)).then(function (result) {
            if (!result.ok) {
                errorBox.textContent = result.data.error || 'Не удалось отправить отзыв.';
                errorBox.classList.remove('d-none');
                return;
            }

            reviewsList.insertAdjacentHTML('afterbegin', result.data.html);
            connectReviewButtons(reviewsList.firstElementChild);
            updateReviewCount(result.data.reviews_count);
            reviewForm.querySelector('[name="text"]').value = '';
            showToast('Отзыв добавлен');
        }).catch(function () {
            showToast('Не удалось отправить отзыв', 'danger');
        });
    });
}
