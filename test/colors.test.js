import { test } from 'node:test'
import assert from 'node:assert/strict'
import { styleText } from 'node:util'
import { colorFor } from '../cli/colors.js'

test('a login always gets the same color, whatever the capitals', () => {
  assert.equal(colorFor('miraskbk'), colorFor('miraskbk'))
  assert.equal(colorFor('MirasKBK'), colorFor('miraskbk'))
})

test('different logins are spread over several colors', () => {
  const logins = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank', 'grace', 'heidi']
  const colors = new Set(logins.map(colorFor))
  assert.ok(colors.size >= 5, `only ${colors.size} different colors for 8 users`)
})

test('every color is one node:util styleText understands', () => {
  for (const login of ['a', 'bb', 'ccc', 'miraskbk', 'x-y_z']) {
    assert.doesNotThrow(() => styleText(colorFor(login), login))
  }
})
