/* eslint-env mocha */
'use strict'

const CID = require('cids')
const multihash = require('multihashes')

const chai = require('chai')
const asPromised = require('chai-as-promised')
chai.use(asPromised)
const expect = chai.expect

const gen = require('../src/generate/')

const countries = Buffer.from(`
name,alpha2,countryCallingCodes,alpha3,ioc,currencies,languages,ccTLD,status
Ascension Island,AC,+247,,SHP,USD,eng,.ac,reserved
Andorra,AD,+376,AND,AND,EUR,cat,,assigned
United Arab Emirates,AE,+971,ARE,UAE,AED,ara,,assigned
Afghanistan,AF,+93,AFG,AFG,AFN,pus,,assigned
Antigua And Barbuda,AG,+1 268,ATG,ANT,XCD,eng,,assigned
`)

const locations = Buffer.from(`
# Copyright (c) 2012 MaxMind LLC.  All Rights Reserved.
locId,country,region,city,postalCode,latitude,longitude,metroCode,areaCode
1,"AD","","","",42.5000,1.5000,,
2,"AE","","","",24.0000,54.0000,,
3,"AF","","","",33.0000,65.0000,,
4,"AG","","","",17.0500,-61.8000,,
`)

const blocks = Buffer.from(`
# Copyright (c) 2011 MaxMind Inc.  All Rights Reserved.
startIpNum,endIpNum,locId
"16777216","16777471","1"
"16777472","16778239","2"
"16778240","16779263","3"
"16779264","16781311","4"
`)

const enc = new TextEncoder()

// identity multihash is useful for inlining data for use in tests
const toIdentityCid = (val) => {
  const bytes = enc.encode(val)
  const mh = multihash.encode(bytes, 'identity')
  return new CID(1, 'dag-pb', mh)
}

describe('generate', () => {
  it('parseCountries', () => {
    return expect(
      gen.parseCountries(countries)
    ).to.eventually.be.eql({
      AC: 'Ascension Island',
      AD: 'Andorra',
      AE: 'United Arab Emirates',
      AF: 'Afghanistan',
      AG: 'Antigua and Barbuda'
    })
  })

  it('parseLocations', () => {
    return expect(
      gen.parseLocations(locations, {
        AC: 'Ascension Island',
        AD: 'Andorra',
        AE: 'United Arab Emirates',
        AF: 'Afghanistan',
        AG: 'Antigua and Barbuda'
      })
    ).to.eventually.be.eql({
      1: ['Andorra', 'AD', '', '', '', 42.5, 1.5, '', ''],
      2: ['United Arab Emirates', 'AE', '', '', '', 24, 54, '', ''],
      3: ['Afghanistan', 'AF', '', '', '', 33, 65, '', ''],
      4: ['Antigua and Barbuda', 'AG', '', '', '', 17.05, -61.8, '', '']
    })
  })

  it('parseBlocks', () => {
    return expect(
      gen.parseBlocks(blocks, {
        1: ['Andorra', 'AD', '', '', '', 42.5, 1.5, '', ''],
        2: ['United Arab Emirates', 'AE', '', '', '', 24, 54, '', ''],
        3: ['Afghanistan', 'AF', '', '', '', 33, 65, '', ''],
        4: ['Antigua and Barbuda', 'AG', '', '', '', 17.05, -61.8, '', '']
      })
    ).to.eventually.be.eql([{
      min: 1,
      data: 0
    }, {
      min: 16777216,
      data: ['Andorra', 'AD', '', '', '', 42.5, 1.5, '', '']
    }, {
      min: 16777472,
      data: ['United Arab Emirates', 'AE', '', '', '', 24, 54, '', '']
    }, {
      min: 16778240,
      data: ['Afghanistan', 'AF', '', '', '', 33, 65, '', '']
    }, {
      min: 16779264,
      data: ['Antigua and Barbuda', 'AG', '', '', '', 17.05, -61.8, '', '']
    }])
  })

  it('putObject', () => {
    const cid = toIdentityCid('myhash').toString()
    const api = {
      object: {
        put: () => Promise.resolve(new CID(cid)),
        stat: (hash) => Promise.resolve({ CumulativeSize: 5 })
      }
    }

    return expect(
      gen.putObject(['hello'], 3, api)
    ).to.eventually.be.eql({
      min: 3,
      size: 5,
      hash: cid
    })
  })

  it('toNode', () => {
    const api = {
      object: {
        put: (val) => Promise.resolve(toIdentityCid('myhash' + val.length)),
        stat: (hash) => Promise.resolve({ CumulativeSize: hash.toString().length })
      }
    }

    return expect(
      gen.toNode([{
        min: 1,
        data: 0
      }, {
        min: 16777216,
        data: ['Andorra', 'AD', '', '', '', 42.5, 1.5, '', '']
      }], api)
    ).to.eventually.be.eql({
      min: 1,
      size: 22,
      hash: toIdentityCid('myhash147').toString()
    })
  })
})
