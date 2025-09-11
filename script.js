'use strict'

let allMovies = []

function changeTierlistMode(type = null) {
    const allowedTypes = {
        names: 'names', 
        posters: 'posters', 
        comb: 'combined'
    }
    const getCardWithPosterHTML = (movieItem, idx) => {
        return `<div class='poster-card' data-idx=${idx}>
            <a href=${movieItem.url} target='_blank'>
                <img src=${movieItem.poster} alt=${movieItem.title || 'unk'}/>
            </a>
        </div>`;
    }
    const getCardWithNameHTML = (movieItem, idx) => {
        return `<li class='name-card' data-idx=${idx}>
            <a href=${movieItem.url} target='_blank'>
                ${movieItem.title}
            </a>
        </li>`
    }
    const getCardWithNameAndPoster = (movieItem, idx) => {
        const getComment = () => {
            return movieItem.comment || null;
        }
        const getYear = () => {
            if (!movieItem.start_year) return null;
            if (!movieItem.end_year) return `<span>${movieItem.start_year}</span>`;
            return `<span style='white-space: nowrap;'>${movieItem.start_year} - ${movieItem.end_year}</span>`;
        }
        const getRate = () => {
            const star = '<i class="fa-solid fa-star"></i>';
            return movieItem.rating ? `<span style='white-space: nowrap;'>${star} ${movieItem.rating}</span>` : null;
        }
        const getTitle = () => {
            return `<a href=${movieItem.url} target='_blank'>${movieItem.title || '???'}</a>`;
        }
        const getDirectors = () => {
            return movieItem?.directors?.map(d => d.name) || [];
        }
        const line1 = [getTitle(), getYear(), getRate()].filter(e => e);
        const line2 = getDirectors();
        const line3 = [getComment()];
        
        return `<div class='name-w-poster-card' data-idx=${idx}>
            <div style='flex-shrink: 0;'>
                <a href=${movieItem.url} target='_blank'>
                    <img src=${movieItem.poster} alt=${movieItem.title || '???'}/>
                </a>
            </div>
            <div style='display: flex; flex-direction: column; gap: 3px;'>
                <span class='details'>
                    ${line1.join('&nbsp; &bull; &nbsp;')}
                </span>
                <div class='details'>
                    ${line2.join('&nbsp; &bull; &nbsp;')}
                </div>
                <div class='comment'>
                    ${line3.join('&nbsp; &bull; &nbsp;')}
                </div>
            </div>
        </div>`;
    }
    const updateTierlist = (type) => {
        const tiers = {
            's': $('#tier-s'),
            'a': $('#tier-a'),
            'b': $('#tier-b'),
            'c': $('#tier-c'),
            'd': $('#tier-d'),
            '?': $('#tier-unk')
        }
        
        Object.values(tiers).forEach(el => el.html(""));

        allMovies.forEach((el, idx) => {
            let t = el?.tier?.toLowerCase();
            if (t.length === 0) return;
            t = (t in tiers) ? t : '?';

            switch (type) {
                case allowedTypes.names:
                    tiers[t].append(getCardWithNameHTML(el, idx));
                    break;
                case allowedTypes.posters:
                    tiers[t].append(getCardWithPosterHTML(el, idx));
                    break;
                case allowedTypes.comb:
                    tiers[t].append(getCardWithNameAndPoster(el, idx));
                    break;
            }
        });

        if (type === allowedTypes.names) {
            Object.values(tiers).forEach(el => el.html('<ul>' + el.html() + '</ul>'));
        }
    }
    const updateDocumentButtons = (type) => {
        $('#tierlist-type-button-set button').removeClass('selected');
        $(`#tierlist-type-button-set button[data-tag=${type}]`).addClass('selected');
    }
    
    if (type === null) {
        type = JSON.parse(localStorage.getItem("tierlist-mode"));
    }
    if (!Object.values(allowedTypes).includes(type)) {
        type = allowedTypes.posters;
    }
    updateTierlist(type);
    updateDocumentButtons(type);
    localStorage.setItem("tierlist-mode", JSON.stringify(type));
}

function downloadCurrentList() {
    const downloadFile = (filename, content) => {
        const blob = new Blob([content], {type: "text/plain"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    downloadFile("movies.json", JSON.stringify(allMovies));
}

function changePosterHeight(posterHeight = null) {
    const updateDocumentButtons = (tag) => {
        $('#poster-size-button-set button').removeClass('selected');
        $(`#poster-size-button-set button[data-tag=${tag}]`).addClass('selected');
    }
    if (posterHeight === null) {
        posterHeight = localStorage.getItem("poster-height");
    }
    if (!posterHeight.match(/^\d+px$/g)) {
        posterHeight = '150px';
    }
    $(":root").css("--poster-height", posterHeight);
    localStorage.setItem("poster-height", posterHeight);
    updateDocumentButtons(posterHeight);
}

async function updateImdbDataAll() {
    const getImdbData_V1 = async (movieId) => {
        movieId = String(movieId)
        if (!movieId.startsWith('tt')) {
            movieId = 'tt' + movieId;
        }
        // found random semi-working public api
        const response = await fetch(`https://imdb.iamidiotareyoutoo.com/search?q=${movieId}`);      
        const ret = {};
        if (response.ok) {
            const json = await response.json();
            for (const movieData of json.description) {
                if (movieData['#IMDB_ID'] === movieId) {
                    // found requested
                    ret.url = movieData['#IMDB_URL'];
                    ret.year = movieData['#YEAR'];
                    ret.title = movieData['#TITLE'];
                    ret.poster = movieData['#IMG_POSTER'];
                    break;
                }
            }
        }
        return ret;
    }

    allMovies = await Promise.all(
        allMovies.map(async el => {
            let imdbData = null;
            if (el.imdb) {
                try {
                    imdbData = await getImdbData_V1(el.imdb);
                } catch {}
            }
            return {...imdbData, ...el};
        }) // map returns array of promises
    );
}


async function main() {

    try {
        let response = await fetch("./movies.ext.json");
        if (!response.ok) response = await fetch("./movies.json");
        const { config, movies } = await response.json();
        
        // update title
        if (config && ("title" in config)) {
            document.title = config.title;
            $('#title').text(config.title);
        }

        allMovies = movies || [];
        
        if (!config.has_extra_info) {
            await updateImdbDataAll();
        }

        changeTierlistMode(null);

        changePosterHeight(null);
        
    } catch (err) {
        console.log(err);
    }
}

main();
