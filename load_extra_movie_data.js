const { argv, exit } = require('node:process');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

async function fetchMovieData(imdbId) {
    const response = await (await fetch(`https://api.imdbapi.dev/titles/${imdbId}`)).json();
    return {
        title: response?.primaryTitle,
        url: `https://www.imdb.com/title/${imdbId}`,
        poster: response?.primaryImage?.url,
        start_year: response?.startYear,
        end_year: response?.endYear,
        rating: response?.rating?.aggregateRating,
        directors: response?.directors?.map(d => ({
           name: d?.displayName 
        })),
    };
}

function fetchRussianMovieNamesAll(imdbIdsAll) {
    // https://www.wikidata.org/wiki/Wikidata:SPARQL_tutorial/ru
    // https://query.wikidata.org
    const ids = JSON.stringify(imdbIdsAll).replaceAll(/[\[\]\,]/g, ' ');
    const query = `SELECT ?imdbId ?movieLabel WHERE {
        VALUES ?imdbId { ${ids} }
        ?movie wdt:P345 ?imdbId;
        SERVICE wikibase:label { bd:serviceParam wikibase:language "ru". }
    }`;
    fs.writeFileSync("wd_query.sparql", query, { flag: "w+" });
    // https://pypi.org/project/wikidata-dl/
    const output = execSync('wikidata-dl wd_query.sparql -f json');
    if (!output.includes('Saved query result')) {
        console.error('Failed to fetch Russian titles from wikidata');
        return;
    }
    const data = JSON.parse(fs.readFileSync('wikidata/wd_query.json', {encoding: 'utf-8'}));
    const bindings = data?.results?.bindings;
    const ret = {};
    bindings.forEach(el => ret[el?.imdbId?.value] = el?.movieLabel?.value);
    return ret;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const srcFile = argv[2];
    const targetFile = argv[3];
    
    if (!srcFile || !targetFile) {
        console.error("Usage: node load_extra_movie_data.js <src_file> <target_file>")
        exit(-1);
    }
    
    const data = fs.readFileSync(srcFile, {encoding: 'utf-8'});
    
    const {config, movies} = JSON.parse(data);
    
    if (!config || !movies) {
        console.error("Invalid source file format");
        exit(-1);
    }

    const validIds = [];

    for (let i = 0; i < movies.length; ++i) {
        let imdbId = String(movies[i].imdb);
        if (imdbId.length === 0) continue;
        if (!imdbId.startsWith('tt')) imdbId = 'tt' + imdbId;
        movies[i].imdb = imdbId;
        validIds.push(imdbId);
        try {
            const extraData = await fetchMovieData(imdbId);
            movies[i] = {...extraData, ...movies[i]};
        } catch (err) {
            console.error(err);
        }
        console.log(`Done ${i+1} / ${movies.length}`);
        await sleep(500);
    }

    const idToRussianTitle = fetchRussianMovieNamesAll(validIds);
    movies.forEach(movie => movie.title_ru = idToRussianTitle[movie?.imdb]);
    console.log("Russian titles fetched");

    config.has_extra_info = true;
    
    fs.writeFileSync(targetFile, JSON.stringify({config, movies}), {encoding: 'utf-8'});

    exit(0);
}

main();
