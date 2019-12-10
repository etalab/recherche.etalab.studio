import pytest
from run import Dataset


@pytest.fixture
def dataset_1():
    return Dataset(
        nb_hits=1,
        default_order=1,
        id="dataset-1",
        title="title",
        page="",
        acronym="",
        post_url="",
        description="",
    )


@pytest.fixture
def dataset_2():
    return Dataset(
        nb_hits=1,
        default_order=1,
        id="dataset-2",
        title="title",
        page="",
        acronym="",
        post_url="",
        description="",
    )


def test_dataset_order_default_by_nb_hits(dataset_1, dataset_2):
    dataset_1.nb_hits = 2
    assert [d.id for d in sorted([dataset_1, dataset_2])] == [
        "dataset-2",
        "dataset-1",
    ]


def test_dataset_order_fallback_on_default_order(dataset_1, dataset_2):
    dataset_1.default_order = 2
    assert [d.id for d in sorted([dataset_1, dataset_2])] == [
        "dataset-2",
        "dataset-1",
    ]


def test_dataset_populate_indexme_on_creation():
    dataset = Dataset(
        nb_hits=1,
        default_order=1,
        id="dataset-1",
        title="title",
        page="",
        acronym="",
        post_url="",
        description="foo bar",
    )
    assert dataset.indexme == "foo bar"


def test_dataset_populate_indexme_manual(dataset_1):
    assert dataset_1.indexme == ""
    dataset_1.populate_indexme("foo bar")
    assert dataset_1.indexme == "foo bar"


def test_dataset_populate_indexme_removes_html_tags(dataset_1):
    dataset_1.populate_indexme("<p>foo</p> <script></script> <strong>bar</strong>")
    assert dataset_1.indexme == "foo bar"


def test_dataset_populate_indexme_removes_urls(dataset_1):
    dataset_1.populate_indexme("foo http://foo.bar https://baz.quux bar")
    assert dataset_1.indexme == "foo bar"


def test_dataset_populate_indexme_removes_punctuation(dataset_1):
    dataset_1.populate_indexme("foo, bar.")
    assert dataset_1.indexme == "foo bar"


def test_dataset_populate_indexme_removes_apostrophe(dataset_1):
    dataset_1.populate_indexme("foo l’bar")
    assert dataset_1.indexme == "foo bar"


def test_dataset_populate_indexme_removes_stop_words(dataset_1):
    dataset_1.populate_indexme("foo seraient bar")
    assert dataset_1.indexme == "foo bar"


def test_dataset_populate_excerpt_on_creation():
    dataset = Dataset(
        nb_hits=1,
        default_order=1,
        id="dataset-1",
        title="title",
        page="",
        acronym="",
        post_url="",
        description="foo bar",
    )
    assert dataset.excerpt == "<p>foo bar</p>"


def test_dataset_populate_excerpt_manual(dataset_1):
    assert dataset_1.excerpt == ""
    dataset_1.populate_excerpt("<p>foo bar</p>")
    assert dataset_1.excerpt == "<p>foo bar</p>"


def test_dataset_populate_excerpt_removes_whitelisted_html_tags(dataset_1):
    dataset_1.populate_excerpt("<p>foo</p> <script></script> <strong>bar</strong>")
    assert dataset_1.excerpt == "<p>foo</p>  bar"


def test_dataset_populate_excerpt_removes_urls(dataset_1):
    dataset_1.populate_excerpt("foo http://foo.bar https://baz.quux bar")
    assert dataset_1.excerpt == "foo   bar"


def test_dataset_populate_excerpt_keeps_punctuation(dataset_1):
    dataset_1.populate_excerpt("foo, bar.")
    assert dataset_1.excerpt == "foo, bar."


def test_dataset_populate_excerpt_keeps_apostrophe(dataset_1):
    dataset_1.populate_excerpt("foo l’bar")
    assert dataset_1.excerpt == "foo l’bar"


def test_dataset_populate_excerpt_keeps_stop_words(dataset_1):
    dataset_1.populate_excerpt("foo seraient bar")
    assert dataset_1.excerpt == "foo seraient bar"


def test_dataset_populate_excerpt_truncates_words(dataset_1):
    dataset_1.populate_excerpt("foo bar", num_words=1)
    assert dataset_1.excerpt == "foo…"


def test_dataset_populate_excerpt_truncates_long_words(dataset_1):
    dataset_1.populate_excerpt("fooooooooo bar", num_words=1)
    assert dataset_1.excerpt == "foooooooo…"


def test_dataset_asdict():
    dataset = Dataset(
        nb_hits=1,
        default_order=1,
        id="dataset-1",
        title="title",
        page="page",
        acronym="ACRONYM",
        post_url="post_url",
        description="foo bar",
    )
    assert dataset.asdict == {
        "id": "dataset-1",
        "title": "title",
        "acronym": "ACRONYM",
        "page": "page",
        "indexme": "foo bar",
        "excerpt": "<p>foo bar</p>",
        "post_url": "post_url",
    }
