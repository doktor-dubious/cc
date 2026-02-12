// lib/zxcvbn.ts
import { zxcvbn, zxcvbnOptions }    from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage     from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage         from '@zxcvbn-ts/language-en'

const options =
{
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: 
    {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
    },
}

zxcvbnOptions.setOptions(options)

export { zxcvbn }