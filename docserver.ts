import * as express from 'express';
import * as path from 'path';
const app = express();

app.use(express.static(path.join(__dirname, 'docs')));

app.listen(8080, () => {
    console.log(`docs active!`);
});
