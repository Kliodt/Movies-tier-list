const { argv, exit } = require('node:process');
const fs = require('node:fs')

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

    for (let i = 0; i < movies.length; ++i) {
        let imdbId = String(movies[i].imdb);
        if (imdbId.length === 0) continue;
        if (!imdbId.startsWith('tt')) imdbId = 'tt' + imdbId;
        try {
            const extraData = await fetchMovieData(imdbId);
            movies[i] = {...extraData, ...movies[i]};
        } catch (err) {
            console.error(err);
        }
        console.log(`Done ${i+1} / ${movies.length}`);
        await sleep(500);
        if (i===10) break;
    }
    
    config.has_extra_info = true;
    
    fs.writeFileSync(targetFile, JSON.stringify({config, movies}), {encoding: 'utf-8'});
}

main();
