'use strict'

let allMovies = []


const TierlistType = {
    POSTERS: 1,
    NAMES: 2,
    NAMES_AND_POSTERS: 3
}


function updateTierlist(type) {
    if (!Object.values(TierlistType).includes(type)) {
        type = TierlistType.POSTERS
    }
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

function changeTierlistMode(type) {
    updateTierlist(type);
    localStorage.setItem("tierlist-mode", JSON.stringify(type));
}

async function updateImdbDataAll() {
    const getImdbData = async (movieId) => {
        movieId = String(movieId)
        if (!movieId.startsWith('tt')) {
            movieId = 'tt' + movieId;
        }
        // found random semi-working public api
        const response = await fetch(`https://imdb.iamidiotareyoutoo.com/search?q=${movieId}`);
        // Example response:
        // {
        //     "ok": true,
        //     "description": [
        //         {
        //             "#TITLE": "Stranger Things",
        //             "#YEAR": 2016,
        //             "#IMDB_ID": "tt4574334",
        //             "#RANK": 40,
        //             "#ACTORS": "Millie Bobby Brown, Finn Wolfhard",
        //             "#AKA": "Stranger Things (2016) ",
        //             "#IMDB_URL": "https://imdb.com/title/tt4574334",
        //             "#IMDB_IV": "https://IMDb.iamidiotareyoutoo.com/title/tt4574334",
        //             "#IMG_POSTER": "https://m.media-amazon.com/images/M/MV5BMjg2NmM0MTEtYWY2Yy00NmFlLTllNTMtMjVkZjEwMGVlNzdjXkEyXkFqcGc@._V1_.jpg",
        //             "photo_width": 1500,
        //             "photo_height": 2222
        //         }
        //     ],
        //     "error_code": 200
        // }
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
                    imdbData = await getImdbData(el.imdb);
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

        await updateImdbDataAll();

        let mode = JSON.parse(localStorage.getItem("tierlist-mode"));
        updateTierlist(mode);
    } catch (err) {
        console.log(err);
    }
    
}

main();