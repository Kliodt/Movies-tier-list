'use strict'

let allMovies = []


const TierlistType = {
    POSTERS: 1,
    NAMES: 2,
    NAMES_AND_POSTERS: 3
}

const PosterHeight = {
    SMALL: '90px',
    NORMAL: '150px',
    LARGE: '200px'
}

function changeTierlistMode(type = null) {
    const updateTierlist = (type) => {
        const getCardWithPosterHTML = (movieItem, idx) => {
            return `<div class='poster-card' data-idx=${idx}>
                <a href=${movieItem.url} target='_blank'>
                    <img src=${movieItem.poster} alt=${movieItem.title || 'unk'}/>
                </a>
            </div>`;
        }
        const getCardWithNameHTML = (movieItem, idx) => {
            return `<div class='name-card' data-idx=${idx}>
                <a href=${movieItem.url} target='_blank'>
                    ${movieItem.title}
                </a>
            </div>`
        }
        const getCardWithNameAndPoster = (movieItem, idx) => {
            const comment = movieItem.comment ? `<span class='comment'>${movieItem.comment}</span>` : null;
            return `<div class='name-w-poster-card' data-idx=${idx}>
                <div style='flex-shrink: 0;'>
                    <a href=${movieItem.url} target='_blank'>
                        <img src=${movieItem.poster} alt=${movieItem.title || 'unk'}/>
                    </a>
                </div>
                <div>
                    <a href=${movieItem.url} target='_blank'>
                        ${movieItem.title}
                    </a>
                    <br/>
                    ${comment || ''}
                </div>
            </div>`;
        }
        const tiers = {
            's': $('#tier-s'),
            'a': $('#tier-a'),
            'b': $('#tier-b'),
            'c': $('#tier-c'),
            'd': $('#tier-d'),
            '?': $('#tier-unk')
        }
        for (const key in tiers) {
            tiers[key].html("");
        }
        allMovies.forEach((el, idx) => {
            let t = el?.tier?.toLowerCase();
            if (t.length === 0) return;
            t = (t in tiers) ? t : '?';
            
            if (type === TierlistType.POSTERS) {
                tiers[t].append(getCardWithPosterHTML(el, idx));
            } else if (type === TierlistType.NAMES) {
                tiers[t].append(getCardWithNameHTML(el, idx));
            } else if (type === TierlistType.NAMES_AND_POSTERS) {
                tiers[t].append(getCardWithNameAndPoster(el, idx));
            }
        });
    }
    
    if (type === null) {
        type = JSON.parse(localStorage.getItem("tierlist-mode"));
    }
    if (!Object.values(TierlistType).includes(type)) {
        type = TierlistType.POSTERS
    }
    updateTierlist(type);
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
    if (posterHeight === null) {
        posterHeight = localStorage.getItem("poster-height");
    }
    if (!Object.values(PosterHeight).includes(posterHeight)) {
        posterHeight = PosterHeight.NORMAL
    }
    $(":root").css("--poster-height", posterHeight);
    localStorage.setItem("poster-height", posterHeight);
}

async function updateImdbDataRequired() {
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

    // const getImdbData_V2 = async (movieId) => {
    //     movieId = String(movieId)
    //     if (!movieId.startsWith('tt')) {
    //         movieId = 'tt' + movieId;
    //     }
    //     // found another random semi-working public api
    //     const response = await fetch(`https://api.imdbapi.dev/titles/${movieId}`);
    //     // Example response:
        
    // }

    allMovies = await Promise.all(
        allMovies.map(async el => {
            let imdbData = null;
            if (el.imdb && (!el.url || !el.year || !el.title || !el.poster)) {
                try {
                    imdbData = await getImdbData_V1(el.imdb);
                } catch {}
            }
            return {...imdbData, ...el};
        }) // map returns array of promises
    );
}


async function main() {

    const getMovies = async () => {
        return await (await fetch("./movies.json")).json();
    }

    try {
        const {config, movies} = await getMovies();
        // update title
        if (config && ("title" in config)) {
            document.title = config.title;
            $('#title').text(config.title);
        }
        if (movies) {
            allMovies = movies;
        }

        await updateImdbDataRequired();

        changeTierlistMode(null);

        changePosterHeight(null);
        
    } catch (err) {
        console.log(err);
    }
    
}

main();