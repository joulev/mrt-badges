# mrt-badges

A small service rendering the SVG station badges of Singapore MRT stations. You can then use the SVGs in your designs or render them in your website or do anything you want.

## Usage

```
https://mrt-badges.joulev.dev/<station identifier>
```

where the station identifier is as follows:

* Each line part of each station starts with the line identifier followed by an optional number
* Standard transfer stations are separated by `:`
* Tap out to transfer stations are separated by `-`

Read the examples below for more details.

## Examples

### Lines

* Thomson–East Coast Line: `https://mrt-badges.joulev.dev/TEL`

  ![TEL](https://mrt-badges.joulev.dev/TEL)

### Single Line Stations

* Kent Ridge MRT station: `https://mrt-badges.joulev.dev/CC24`

  ![Kent Ridge MRT](https://mrt-badges.joulev.dev/CC24)

* Founders' Memorial MRT station: `https://mrt-badges.joulev.dev/TE22A`

  ![Founders' Memorial MRT](https://mrt-badges.joulev.dev/TE22A)

### Standard Transfer Interchanges

* Orchard MRT station: `https://mrt-badges.joulev.dev/TE14:NS22` (or `NS22:TE14` depending on the order you want)

  ![Orchard MRT](https://mrt-badges.joulev.dev/TE14:NS22)

* Outram Park MRT station: `https://mrt-badges.joulev.dev/EW16:NE3:TE17`

  ![Outram Park MRT](https://mrt-badges.joulev.dev/EW16:NE3:TE17)

* Tanah Merah MRT station: `https://mrt-badges.joulev.dev/EW4:CG`

  ![Tanah Merah MRT](https://mrt-badges.joulev.dev/EW4:CG)

### Tap out to Transfer Interchanges

* Newton MRT station: `https://mrt-badges.joulev.dev/NS21-DT11`

  ![Newton MRT](https://mrt-badges.joulev.dev/NS21-DT11)

### LRT Stations

* Sengkang MRT/LRT station: `https://mrt-badges.joulev.dev/NE16:STC`

  ![Sengkang MRT](https://mrt-badges.joulev.dev/NE16:STC)

* Phoenix LRT station: `https://mrt-badges.joulev.dev/BP5`

  ![Phoenix LRT](https://mrt-badges.joulev.dev/BP5)

### Future Stations

Confirmed lines only, so Seletar Line is not included.

* Teck Ghee MRT station: `https://mrt-badges.joulev.dev/CR12`

  ![Teck Ghee MRT](https://mrt-badges.joulev.dev/CR12)

* Pasir Ris MRT station: `https://mrt-badges.joulev.dev/CP1:CR5:EW1`

  ![Pasir Ris MRT](https://mrt-badges.joulev.dev/CP1:CR5:EW1)

* Jurong East MRT station: `https://mrt-badges.joulev.dev/JE5:NS1:EW24`

  ![Jurong East MRT](https://mrt-badges.joulev.dev/JE5:NS1:EW24)

### Why not, go wild!

* Downtown MRT and Marina Bay MRT are within a 15 minute walk so can be treated as one tap out to transfer station: `https://mrt-badges.joulev.dev/DT17-NS27:TE20:CE2`

  ![Downtown–Marina Bay MRT](https://mrt-badges.joulev.dev/DT17-NS27:TE20:CE2)

* Well... `https://mrt-badges.joulev.dev/EW1-NS2:NE3-CC4-DT5:TE6:CR7-JS8`

  ![This station doesn't exist](https://mrt-badges.joulev.dev/EW1-NS2:NE3-CC4-DT5:TE6:CR7-JS8)

## Limitations

* Does not support a custom colour scheme and additional lines yet

  ![Woodlands North MRT with future parts](https://r2.joulev.dev/files/uuqzj0yr9bovaohhjlaqwh2n)

  This may be supported in the future.

* Does not support "under study" stations (with the dashed border) like this

  ![Future Sungei Kadut MRT](https://r2.joulev.dev/files/zl48bqd6p2a6duy4fojvt93h)

* Only supports horizontal for now, so an arbitrary direction like this is not supported

  ![Tampines MRT](https://r2.joulev.dev/files/k8nfukrabl6q4fvdn9orgkbu)

* The badges do not match 100% with official badges you see on official maps. The reason being we do not have the official vector graphic nor the official font. That said I think the version here should be very close to the official badges already.

## Credits

* The font here is an [unofficial clone of the LTA Identity font](https://github.com/jglim/IdentityFont) by [JinGen Lim](https://github.com/jglim).

* The official system map by LTA as of 10 March 2024 and the [unofficial future system map](https://adobe.ly/3M2fyju) by [bananasolid](https://www.youtube.com/@bananasolid) was used to study the colours and the dimensions of the badges. The future system map is also used to capture the screenshots in the limitations section above.

## License

* The source code is MIT licensed.

* The service at `https://mrt-badges.joulev.dev` is provided free of charge on a best effort basis, meaning I will try all my best to keep it running but if personal reasons force me to bring it down, I will have to do that. Hence self-hosting is recommended:

  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjoulev%2Fmrt-badges&project-name=mrt-badges&repository-name=mrt-badges)

## Development

* `pnpm vercel dev` to develop locally at `http://localhost:3000`

* `pnpm check` to run Biome checks
