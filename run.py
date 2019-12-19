#!/usr/bin/env python3
import itertools
import re
import string
from dataclasses import dataclass
from time import perf_counter
from typing import Any, List, Optional

import bleach
import httpx
import markdown
import minicli
from jinja2 import Environment, FileSystemLoader
from truncate import Truncator

environment = Environment(loader=FileSystemLoader("."))

STOP_WORLDS = [
    "ai",
    "aie",
    "aient",
    "aies",
    "ait",
    "as",
    "au",
    "aura",
    "aurai",
    "auraient",
    "aurais",
    "aurait",
    "auras",
    "aurez",
    "auriez",
    "aurions",
    "aurons",
    "auront",
    "aux",
    "avaient",
    "avais",
    "avait",
    "avec",
    "avez",
    "aviez",
    "avions",
    "avons",
    "ayant",
    "ayez",
    "ayons",
    "c",
    "ce",
    "ceci",
    "celà",
    "ces",
    "cet",
    "cette",
    "d",
    "dans",
    "de",
    "des",
    "du",
    "elle",
    "en",
    "es",
    "est",
    "et",
    "eu",
    "eue",
    "eues",
    "eurent",
    "eus",
    "eusse",
    "eussent",
    "eusses",
    "eussiez",
    "eussions",
    "eut",
    "eux",
    "eûmes",
    "eût",
    "eûtes",
    "furent",
    "fus",
    "fusse",
    "fussent",
    "fusses",
    "fussiez",
    "fussions",
    "fut",
    "fûmes",
    "fût",
    "fûtes",
    "ici",
    "il",
    "ils",
    "j",
    "je",
    "l",
    "la",
    "le",
    "les",
    "leur",
    "leurs",
    "lui",
    "m",
    "ma",
    "mais",
    "me",
    "mes",
    "moi",
    "mon",
    "même",
    "n",
    "ne",
    "nos",
    "notre",
    "nous",
    "on",
    "ont",
    "ou",
    "par",
    "pas",
    "pour",
    "qu",
    "que",
    "quel",
    "quelle",
    "quelles",
    "quels",
    "qui",
    "s",
    "sa",
    "sans",
    "se",
    "sera",
    "serai",
    "seraient",
    "serais",
    "serait",
    "seras",
    "serez",
    "seriez",
    "serions",
    "serons",
    "seront",
    "ses",
    "soi",
    "soient",
    "sois",
    "soit",
    "sommes",
    "son",
    "sont",
    "soyez",
    "soyons",
    "suis",
    "sur",
    "t",
    "ta",
    "te",
    "tes",
    "toi",
    "ton",
    "tu",
    "un",
    "une",
    "vos",
    "votre",
    "vous",
    "y",
    "à",
    "étaient",
    "étais",
    "était",
    "étant",
    "étiez",
    "étions",
    "été",
    "étée",
    "étées",
    "étés",
    "êtes",
]
punctuation = {key: None for key in string.punctuation}
smart_apostrophes = {"’": " "}
table = str.maketrans({**punctuation, **smart_apostrophes})


@dataclass
class Playlist:
    slug: str
    title: str


@dataclass(order=True)
class Dataset:
    nb_hits: int  # Keep it first for ordering.
    default_order: int  # Keep it second for ordering.
    id: str  # Useful to deduplicate.
    title: str
    page: str
    acronym: Optional[str]
    post_url: Optional[str]
    description: str
    indexme: Optional[str] = ""
    excerpt: Optional[str] = ""

    def __post_init__(self) -> None:
        html_description = markdown.markdown(self.description)
        self.populate_indexme(html_description)
        self.populate_excerpt(html_description)

    def __hash__(self) -> int:
        """Required for deduplication via set()."""
        return hash(self.id)

    def __eq__(self, other: "Dataset") -> bool:
        """Required for deduplication via set()."""
        if isinstance(other, Dataset):
            return self.id == other.id
        raise NotImplementedError

    def populate_indexme(self, html_description: str) -> None:
        notags = bleach.clean(html_description, tags=[], strip=True,)
        unlinkified = re.sub(r"http\S+", "", notags)
        nopunctuation = unlinkified.translate(table)
        nostopwords = " ".join(
            word
            for word in nopunctuation.split()
            if word.lower().strip() not in STOP_WORLDS
        )
        self.indexme = nostopwords

    def populate_excerpt(self, html_description: str, num_words: int = 50) -> None:
        sanitized_description = bleach.clean(
            html_description, tags=["p", "li", "ol", "ul",], strip=True,
        )
        truncated_description = Truncator(sanitized_description).words(
            num=num_words, truncate="…", html=True
        )
        if len(truncated_description) > num_words * 10:
            # May happen with Data INSEE sur les communes given the description
            # https://www.data.gouv.fr/fr/datasets/data-insee-sur-les-communes/
            truncated_description = Truncator(truncated_description).chars(
                num=num_words * 10, truncate="…", html=True
            )
        unlinkified_description = re.sub(r"http\S+", "", truncated_description)
        self.excerpt = unlinkified_description

    @property
    def asdict(self):
        return {
            "id": self.id,
            "title": self.title,
            "indexme": self.indexme,
            "excerpt": self.excerpt,
            "acronym": self.acronym,
            "page": self.page,
            "post_url": self.post_url,
        }


async def fetch_json_data(url: str) -> dict:
    async with httpx.Client(base_url="https://www.data.gouv.fr") as client:
        response = await client.get(url, timeout=20.0)
        return response.json()


async def fetch_url_list(url: str) -> List[str]:
    async with httpx.Client(base_url="https://www.data.gouv.fr") as client:
        response = await client.get(url, timeout=20.0)
        return response.text.split("\n")


def convert_to_dataset(item: dict, index: int) -> Dataset:
    return Dataset(
        nb_hits=item["metrics"].get("nb_hits", 0),
        default_order=index,
        id=item["id"],
        title=item["title"],
        description=item["description"],
        acronym=item["acronym"],
        page=item["page"],
        post_url="",
    )


def deduplicate_datasets(datasets: List[Dataset]) -> List[Dataset]:
    return set(datasets)


def write_datasets(datasets: List[Dataset]) -> None:
    template = environment.get_template("template.html")
    content = template.render(datasets=[dataset.asdict for dataset in datasets])
    open("index.html", "w").write(content)


def extract_slug(url: str) -> str:
    return url[len("https://www.data.gouv.fr/fr/datasets/") : -1]


def flatten(list_of_lists: List[List[Any]]) -> List[Any]:
    return list(itertools.chain(*list_of_lists))


async def fetch_playlist(playlist: Playlist) -> List[Dataset]:
    dataset = await fetch_json_data(f"/api/1/datasets/{playlist.slug}/")
    for resource in dataset["resources"]:
        if resource["title"] == playlist.title:
            dataset_urls = await fetch_url_list(resource["url"])
    dataset_slugs = [extract_slug(dataset_url) for dataset_url in dataset_urls]
    datasets = [
        convert_to_dataset(await fetch_json_data(f"/api/1/datasets/{dataset_slug}/"), i)
        for i, dataset_slug in enumerate(dataset_slugs)
    ]
    return datasets


async def fetch_playlists(playlists: List[Playlist]) -> List[Dataset]:
    return flatten([await fetch_playlist(playlist) for playlist in playlists])


async def fetch_featured_datasets_by_nb_hits(nb_datasets: int) -> List[Dataset]:
    data = await fetch_json_data(
        f"/api/1/datasets/?featured=true&page_size={nb_datasets}"
    )
    datasets = [
        convert_to_dataset(item, i) for i, item in enumerate(reversed(data["data"]))
    ]
    return sorted(datasets, reverse=True)


async def fetch_blog_datasets_by_nb_hits(nb_blogposts: int) -> List[Dataset]:
    blogposts = await fetch_json_data(
        f"/api/1/posts/?page=1&page_size={nb_blogposts}&sort=-created_at"
    )
    datasets = []
    for blogpost in blogposts["data"]:
        post_url = blogpost["page"]
        for i, dataset in enumerate(reversed(blogpost["datasets"])):
            data = await fetch_json_data(dataset["uri"])
            dataset = convert_to_dataset(data, i)
            dataset.post_url = post_url
            datasets.append(dataset)

    return sorted(datasets, reverse=True)


@minicli.cli
async def generate_data(nb_datasets: int = 100, nb_blogposts: int = 2) -> None:
    playlists = [
        Playlist(slug="mes-playlists-13", title="SPD"),
        Playlist(slug="mes-playlists-13", title="Géo"),
    ]
    print(
        f"Fetching {len(playlists)} playlists + {nb_datasets} featured datasets"
        f" + {nb_blogposts} blog posts related datasets."
    )
    playlists_datasets = await fetch_playlists(playlists)
    featured_datasets_by_nb_hits = await fetch_featured_datasets_by_nb_hits(nb_datasets)
    blog_datasets_by_nb_hits = await fetch_blog_datasets_by_nb_hits(nb_blogposts)
    datasets = deduplicate_datasets(
        playlists_datasets + blog_datasets_by_nb_hits + featured_datasets_by_nb_hits
    )
    print(f"Writing {len(datasets)} datasets to index.html")
    write_datasets(sorted(datasets, reverse=True))


@minicli.wrap
def perf_wrapper():
    start = perf_counter()
    yield
    elapsed = perf_counter() - start
    print(f"Done in {elapsed:.5f} seconds.")


if __name__ == "__main__":
    minicli.run()
