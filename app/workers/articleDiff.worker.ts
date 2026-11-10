import { compareArticle } from '../utils/articleDiff'
import type { ArticleComparisonRequest, ArticleComparisonResponse } from '../../shared/types/article-comparison'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ArticleComparisonRequest>) => void) | null
  postMessage: (message: ArticleComparisonResponse) => void
}

scope.onmessage = ({ data }) => {
  try {
    scope.postMessage({
      type: 'result', requestId: data.requestId, articleId: data.articleId, result: compareArticle(data),
    })
  }
  catch {
    scope.postMessage({
      type: 'error', requestId: data.requestId, articleId: data.articleId, code: 'comparison-failed',
      message: 'We could not compare these sources. Please try again.',
    })
  }
}
