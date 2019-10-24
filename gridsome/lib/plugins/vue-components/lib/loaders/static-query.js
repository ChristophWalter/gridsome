const path = require('path')
const LRU = require('lru-cache')
// const hash = require('hash-sum')
// const validate = require('../validate')
// const { parse, findDeprecatedUsages } = require('graphql')
const { parse } = require('graphql')
// const { deprecate } = require('../../../../utils/deprecate')

const fetch = require('node-fetch')
const { getOptions } = require('loader-utils')


const cache = new LRU({ max: 1000 })

module.exports = async function (source, map) {
  // const { config, store, schema } = process.GRIDSOME
  // const resourcePath = this.resourcePath

  // add dependency to now.js to re-run
  // this loader when store has changed
  // if (process.env.NODE_ENV === 'development') {
  //   this.dependency(path.join(config.tmpDir, 'now.js'))
  // }

  const callback = this.async()
  // const cacheKey = hash({ source, resourcePath, lastUpdate: store.lastUpdate })
  // const cached = cache.get(cacheKey)

  // if (cached) {
  //   callback(null, cached, map)
  //   return
  // }

  if (!source.trim()) {
    callback(null, '', map)
    return
  }

  // try {
  //   const errors = validate(schema.getSchema(), source)
  //
  //   if (errors && errors.length) {
  //     this.callback(new Error(errors[0]), source, map)
  //     return
  //   }
  // } catch (err) {
  //   this.callback(err, source, map)
  //   return
  // }

  let ast = null

  try {
    ast = parse(source)
  } catch (err) {
    callback(err, source, map)
    return
  }

  // const { errors, data } = await schema.runQuery(ast)

  // if (errors && errors.length) {
  //   callback(new Error(errors[0]), source, map)
  //   return
  // }

  /* Workaround: Send graphql query directly */
  const options = getOptions(this)
  const trimmedSource = source.trim(source)
  if (!trimmedSource) {
    callback(null, '', map)
    return
  }
  const response = await fetch(options.gridsomeGraphqlEndpoint, {
    method: 'post',
    body: JSON.stringify({
      query: trimmedSource
    }),
    headers: { 'Content-Type': 'application/json' }
  })
  const stringResponse = await response.text()
  /* Workaround end */

  const res = `
    import Vue from 'vue'

    const { computed } = Vue.config.optionMergeStrategies
    const data = ${stringResponse}

    export default ({ options }) => {
      if (options.__staticData) {
        options.__staticData.data = data
        return
      }

      options.__staticData = Vue.observable({ data })

      options.computed = computed({
        $static: () => options.__staticData.data
      }, options.computed)
    }
  `

  // cache.set(cacheKey, res)

  // findDeprecatedUsages(schema.getSchema(), ast).forEach(err => {
  //   let line = 0
  //   let column = 0
  //
  //   if (Array.isArray(err.locations) && err.locations.length) {
  //     [{ line, column }] = err.locations
  //   }
  //
  //   deprecate(err.message, {
  //     customCaller: [resourcePath, line, column]
  //   })
  // })

  callback(null, res, map)
}
